const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const { verifyOTP } = require('./otp.controller');

// Register new user
exports.register = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, phoneNumber, password, otp } = req.body;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ phoneNumber }, { username }] });
        if (user) {
            return res.status(400).json({
                message: 'User already exists with this phone number or username'
            });
        }

        // Verify OTP
        const isValidOTP = await verifyOTP('register', otp);
        if (!isValidOTP) {
            return res.status(400).json({
                message: 'Invalid or expired OTP'
            });
        }

        // Create new user
        user = new User({
            username,
            phoneNumber,
            password,
            isVerified: true // Automatically verify user after successful OTP verification
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                refId: user.refId
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { phoneNumber, password, deviceToken } = req.body;

        // Check if user exists
        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(401).json({ message: 'Please verify your phone number first' });
        }

        // Check if user is already logged in on another device
        if (user.deviceToken && user.deviceToken !== deviceToken) {
            return res.status(401).json({
                message: 'Account is already logged in on another device',
                lastLoginAt: user.lastLoginAt
            });
        }

        // Update device token and last login time
        user.deviceToken = deviceToken;
        user.lastLoginAt = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                refId: user.refId
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Logout user
exports.logout = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Clear device token
        user.deviceToken = null;
        await user.save();

        res.json({
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Request forgot password
exports.forgotPassword = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { phoneNumber } = req.body;

        // Check if user exists
        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(404).json({ message: 'User not found with this phone number' });
        }

        // Generate OTP (in production, this should be random and stored securely)
        const resetOTP = '123456'; // This should be generated randomly in production

        // In production: Send OTP via SMS to user's phone number
        // For demo, we're using a fixed OTP

        // Store OTP and expiry time in user document
        user.resetPasswordOTP = resetOTP;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
        await user.save();

        res.json({
            message: 'Password reset OTP has been sent to your phone number',
            // For demo purposes only, remove in production
            otp: resetOTP
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reset password with OTP
exports.resetPassword = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { phoneNumber, otp, newPassword } = req.body;
        console.log('Reset password request:', { phoneNumber, otp });

        // Find user by phone number
        const user = await User.findOne({ phoneNumber });
        if (!user) {
            console.log('User not found:', phoneNumber);
            return res.status(404).json({
                message: 'User not found with this phone number'
            });
        }

        console.log('User found:', user._id);

        // Verify OTP
        const isValidOTP = await verifyOTP('reset-password', otp);
        console.log('OTP verification result:', isValidOTP);

        if (!isValidOTP) {
            return res.status(400).json({
                message: 'Invalid or expired OTP'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        console.log('Password reset successful for user:', user._id);

        res.json({
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId)
            .select('-password')
            .populate('vipInfo.package');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if VIP has expired
        if (user.vipInfo && user.vipInfo.endDate && user.vipInfo.endDate < new Date()) {
            user.vipInfo.isActive = false;
            await user.save();
        }

        // Calculate remaining days for VIP
        let remainingDays = 0;
        if (user.vipInfo && user.vipInfo.isActive && user.vipInfo.endDate) {
            const now = new Date();
            const endDate = new Date(user.vipInfo.endDate);
            remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            remainingDays = remainingDays > 0 ? remainingDays : 0;
        }

        res.json({
            message: 'Profile fetched successfully',
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                refId: user.refId,
                balance: user.balance,
                createdAt: user.createdAt,
                vip: user.vipInfo && user.vipInfo.isActive && user.vipInfo.package ? user.vipInfo.package.name : "VIP 0",
                vipInfo: user.vipInfo && user.vipInfo.package ? {
                    package: user.vipInfo.package,
                    startDate: user.vipInfo.startDate,
                    endDate: user.vipInfo.endDate,
                    isActive: user.vipInfo.isActive,
                    remainingDays
                } : null
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password')
            .populate('vipInfo.package')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        // Calculate remaining days for each user's VIP
        const usersWithRemainingDays = users.map(user => {
            const userData = user.toObject();

            // If user has no VIP or VIP is not active, return null for vipInfo
            if (!user.vipInfo || !user.vipInfo.package || !user.vipInfo.isActive) {
                userData.vipInfo = null;
                userData.vip = "VIP 0";
                return userData;
            }

            // Calculate remaining days for active VIP
            const now = new Date();
            const endDate = new Date(user.vipInfo.endDate);
            const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

            userData.vipInfo = {
                package: user.vipInfo.package,
                startDate: user.vipInfo.startDate,
                endDate: user.vipInfo.endDate,
                isActive: user.vipInfo.isActive,
                remainingDays: remainingDays > 0 ? remainingDays : 0
            };
            userData.vip = user.vipInfo.package.name;

            return userData;
        });

        res.json({
            message: 'Users fetched successfully',
            users: usersWithRemainingDays,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search users by refId, username or phoneNumber (admin only)
exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Search by refId, username or phoneNumber
        const searchQuery = {
            $or: [
                { refId: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } },
                { phoneNumber: { $regex: query, $options: 'i' } }
            ]
        };

        const users = await User.find(searchQuery)
            .select('-password')
            .populate('vipInfo.package')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(searchQuery);

        // Calculate remaining days for each user's VIP
        const usersWithRemainingDays = users.map(user => {
            const userData = user.toObject();

            // If user has no VIP or VIP is not active, return null for vipInfo
            if (!user.vipInfo || !user.vipInfo.package || !user.vipInfo.isActive) {
                userData.vipInfo = null;
                userData.vip = "VIP 0";
                return userData;
            }

            // Calculate remaining days for active VIP
            const now = new Date();
            const endDate = new Date(user.vipInfo.endDate);
            const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

            userData.vipInfo = {
                package: user.vipInfo.package,
                startDate: user.vipInfo.startDate,
                endDate: user.vipInfo.endDate,
                isActive: user.vipInfo.isActive,
                remainingDays: remainingDays > 0 ? remainingDays : 0
            };
            userData.vip = user.vipInfo.package.name;

            return userData;
        });

        res.json({
            message: 'Users search completed',
            users: usersWithRemainingDays,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}; 