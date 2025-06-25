const VipPackage = require('../models/vip-package.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');

// Get all VIP packages
exports.getAllPackages = async (req, res) => {
    try {
        const packages = await VipPackage.find({ isActive: true }).sort({ price: 1 });

        // Get user's current VIP info
        const user = await User.findById(req.user.id).populate('vipInfo.package');
        const userCurrentVip = user.vipInfo && user.vipInfo.isActive ? user.vipInfo.package : null;

        // Filter packages based on user's current VIP
        let availablePackages = packages;
        if (userCurrentVip) {
            if (userCurrentVip.name === 'VIP 1') {
                availablePackages = packages.filter(pkg => pkg.name === 'VIP 2' || pkg.name === 'VIP 3');
            } else if (userCurrentVip.name === 'VIP 2') {
                availablePackages = packages.filter(pkg => pkg.name === 'VIP 3');
            } else if (userCurrentVip.name === 'VIP 3') {
                availablePackages = []; // No higher packages available
            }
        }

        // Calculate adjusted prices based on user's current VIP
        const adjustedPackages = availablePackages.map(pkg => {
            const packageData = pkg.toObject();

            if (userCurrentVip) {
                // If user has VIP 1 and trying to buy VIP 2 or 3
                if (userCurrentVip.name === 'VIP 1') {
                    if (pkg.name === 'VIP 2') {
                        packageData.adjustedPrice = pkg.price - 10000; // VIP 1 price
                    } else if (pkg.name === 'VIP 3') {
                        packageData.adjustedPrice = pkg.price - 10000; // VIP 1 price
                    }
                }
                // If user has VIP 2 and trying to buy VIP 3
                else if (userCurrentVip.name === 'VIP 2') {
                    if (pkg.name === 'VIP 3') {
                        packageData.adjustedPrice = pkg.price - 100000; // VIP 2 price
                    }
                }
            }

            // If no adjustment needed, use original price
            if (!packageData.adjustedPrice) {
                packageData.adjustedPrice = pkg.price;
            }

            // Add remaining time if user has VIP
            if (user.vipInfo && user.vipInfo.isActive) {
                const now = new Date();
                const endDate = new Date(user.vipInfo.endDate);
                const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                packageData.remainingDays = remainingDays > 0 ? remainingDays : 0;
            }

            return packageData;
        });

        res.json({
            message: 'VIP packages fetched successfully',
            packages: adjustedPackages,
            currentVip: userCurrentVip ? userCurrentVip.name : 'VIP 0',
            remainingDays: user.vipInfo && user.vipInfo.isActive ?
                Math.ceil((new Date(user.vipInfo.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Purchase VIP package
exports.purchasePackage = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { packageId } = req.body;
        const userId = req.user.id;

        // Get package details
        const vipPackage = await VipPackage.findById(packageId);
        if (!vipPackage || !vipPackage.isActive) {
            return res.status(404).json({ message: 'VIP package not found or inactive' });
        }

        // Get user
        const user = await User.findById(userId).populate('vipInfo.package');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate adjusted price based on current VIP
        let adjustedPrice = vipPackage.price;
        if (user.vipInfo && user.vipInfo.isActive && user.vipInfo.package) {
            const currentVip = user.vipInfo.package;
            // Subtract the price of current VIP package from the new package price
            adjustedPrice = vipPackage.price - currentVip.price;
        }

        // Check balance with adjusted price
        if (user.balance < adjustedPrice) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + vipPackage.duration);

        // If user already has VIP, use the later date between current end date and new end date
        if (user.vipInfo && user.vipInfo.isActive && user.vipInfo.endDate > startDate) {
            const currentEndDate = new Date(user.vipInfo.endDate);
            if (currentEndDate > endDate) {
                endDate.setTime(currentEndDate.getTime());
            }
        }

        // Update user's balance with adjusted price and VIP info
        user.balance -= adjustedPrice;
        user.vipInfo = {
            package: vipPackage._id,
            startDate,
            endDate,
            isActive: true
        };

        await user.save();

        res.json({
            message: 'VIP package purchased successfully',
            vipInfo: {
                package: vipPackage,
                startDate,
                endDate,
                isActive: true
            },
            remainingBalance: user.balance,
            adjustedPrice: adjustedPrice,
            originalPrice: vipPackage.price
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get user's VIP status
exports.getVipStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).populate('vipInfo.package');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if VIP has expired
        if (user.vipInfo && user.vipInfo.endDate && user.vipInfo.endDate < new Date()) {
            user.vipInfo.isActive = false;
            await user.save();
        }

        res.json({
            message: 'VIP status fetched successfully',
            vipInfo: user.vipInfo
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// === ADMIN FUNCTIONS ===

// Cancel VIP for any user (Admin only)
exports.cancelUserVip = async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user
        const user = await User.findById(userId).populate('vipInfo.package');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user has active VIP
        if (!user.vipInfo || !user.vipInfo.isActive) {
            return res.status(400).json({ message: 'User does not have an active VIP package' });
        }

        const currentVipPackage = user.vipInfo.package;

        // Deactivate VIP
        user.vipInfo.isActive = false;
        user.vipInfo.endDate = new Date(); // Set end date to now

        await user.save();

        res.json({
            message: 'VIP package cancelled successfully',
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                refId: user.refId
            },
            cancelledVip: {
                package: currentVipPackage,
                cancelledAt: new Date()
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Grant VIP package to any user (Admin only)
exports.grantUserVip = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, packageId, duration } = req.body;

        // Get user
        const user = await User.findById(userId).populate('vipInfo.package');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get package details
        const vipPackage = await VipPackage.findById(packageId);
        if (!vipPackage || !vipPackage.isActive) {
            return res.status(404).json({ message: 'VIP package not found or inactive' });
        }

        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();

        // Use custom duration if provided, otherwise use package default duration
        const packageDuration = duration || vipPackage.duration;
        endDate.setDate(endDate.getDate() + packageDuration);

        // Store previous VIP info for response
        const previousVip = user.vipInfo && user.vipInfo.isActive ? {
            package: user.vipInfo.package,
            endDate: user.vipInfo.endDate
        } : null;

        // Grant VIP (no balance deduction for admin grants)
        user.vipInfo = {
            package: vipPackage._id,
            startDate,
            endDate,
            isActive: true
        };

        await user.save();

        res.json({
            message: 'VIP package granted successfully',
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                refId: user.refId
            },
            grantedVip: {
                package: vipPackage,
                startDate,
                endDate,
                duration: packageDuration,
                isActive: true
            },
            previousVip
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get VIP status for any user (Admin only)
exports.getUserVipStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).populate('vipInfo.package');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if VIP has expired
        if (user.vipInfo && user.vipInfo.endDate && user.vipInfo.endDate < new Date()) {
            user.vipInfo.isActive = false;
            await user.save();
        }

        res.json({
            message: 'User VIP status fetched successfully',
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                refId: user.refId,
                balance: user.balance
            },
            vipInfo: user.vipInfo
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all users with VIP packages (Admin only)
exports.getAllVipUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        // Build filter
        let filter = { 'vipInfo.package': { $exists: true } };

        if (status === 'active') {
            filter['vipInfo.isActive'] = true;
            filter['vipInfo.endDate'] = { $gt: new Date() };
        } else if (status === 'expired') {
            filter['$or'] = [
                { 'vipInfo.isActive': false },
                { 'vipInfo.endDate': { $lte: new Date() } }
            ];
        }

        const users = await User.find(filter)
            .populate('vipInfo.package')
            .select('username phoneNumber refId balance vipInfo createdAt')
            .sort({ 'vipInfo.endDate': -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(filter);

        res.json({
            message: 'VIP users fetched successfully',
            users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalUsers: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}; 