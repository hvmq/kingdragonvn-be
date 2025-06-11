const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['register', 'reset-password'],
        required: true
    },
    value: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model('OTP', otpSchema); 