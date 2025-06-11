const mongoose = require('mongoose');

const vipPackageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    duration: {
        type: Number, // Duration in days
        required: true
    },
    description: {
        type: String,
        required: true
    },
    benefits: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('VipPackage', vipPackageSchema); 