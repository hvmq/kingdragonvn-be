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
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate price based on current VIP
        let finalPrice = vipPackage.price;
        if (user.vipInfo && user.vipInfo.isActive && user.vipInfo.package) {
            const currentVip = user.vipInfo.package;
            if (currentVip.name === 'VIP 1') {
                if (vipPackage.name === 'VIP 2' || vipPackage.name === 'VIP 3') {
                    finalPrice = vipPackage.price - 10000;
                }
            } else if (currentVip.name === 'VIP 2' && vipPackage.name === 'VIP 3') {
                finalPrice = vipPackage.price - 100000;
            }
        }

        // Check balance
        if (user.balance < finalPrice) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + vipPackage.duration);

        // If user already has VIP, extend the duration
        if (user.vipInfo && user.vipInfo.isActive && user.vipInfo.endDate > startDate) {
            endDate.setDate(user.vipInfo.endDate.getDate() + vipPackage.duration);
        }

        // Update user's balance and VIP info
        user.balance -= finalPrice;
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
            remainingBalance: user.balance
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