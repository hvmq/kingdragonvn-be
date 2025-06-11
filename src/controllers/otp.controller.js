const OTP = require('../models/otp.model');
const { validationResult } = require('express-validator');

// Get current OTP
exports.getCurrentOTP = async (req, res) => {
    try {
        const { type } = req.query;
        const otp = await OTP.findOne({ type, isActive: true })
            .sort({ createdAt: -1 });

        if (!otp) {
            return res.status(404).json({ message: 'No active OTP found' });
        }

        res.json({
            message: 'OTP fetched successfully',
            otp: {
                value: otp.value,
                type: otp.type,
                createdAt: otp.createdAt,
                expiresAt: otp.expiresAt,
                isActive: otp.isActive
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create new OTP
exports.createOTP = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { type, value, durationInMinutes = 10 } = req.body;

        // Deactivate all existing OTPs of the same type
        await OTP.updateMany(
            { type, isActive: true },
            { isActive: false }
        );

        // Calculate expiration time
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + durationInMinutes);

        // Create new OTP
        const otp = new OTP({
            type,
            value,
            expiresAt
        });

        await otp.save();

        res.status(201).json({
            message: 'OTP created successfully',
            otp: {
                value: otp.value,
                type: otp.type,
                createdAt: otp.createdAt,
                expiresAt: otp.expiresAt,
                isActive: otp.isActive
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Verify OTP
exports.verifyOTP = async (type, value) => {
    try {
        console.log('Verifying OTP:', { type, value });

        const otp = await OTP.findOne({
            type,
            value,
            isActive: true
        }).sort({ createdAt: -1 });

        console.log('Found OTP:', otp);

        if (!otp) {
            console.log('No active OTP found');
            return false;
        }

        // Check if OTP is expired
        const now = new Date();
        console.log('Current time:', now);
        console.log('OTP expires at:', otp.expiresAt);

        if (now > otp.expiresAt) {
            console.log('OTP is expired');
            // Deactivate expired OTP
            otp.isActive = false;
            await otp.save();
            return false;
        }

        console.log('OTP is valid');
        return true;
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return false;
    }
};

// Deactivate OTP
exports.deactivateOTP = async (req, res) => {
    try {
        const { type } = req.params;

        const result = await OTP.updateMany(
            { type, isActive: true },
            { isActive: false }
        );

        if (result.nModified === 0) {
            return res.status(404).json({ message: 'No active OTP found to deactivate' });
        }

        res.json({
            message: 'OTP deactivated successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}; 