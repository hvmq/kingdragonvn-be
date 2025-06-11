const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [/^(0|84|\+84)?[35789][0-9]{8}$/, 'Please provide a valid Vietnamese phone number']
    },
    refId: {
        type: String,
        unique: true,
        length: 6,
        sparse: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Balance cannot be negative']
    },
    vipInfo: {
        package: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VipPackage'
        },
        startDate: Date,
        endDate: Date,
        isActive: {
            type: Boolean,
            default: false
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    resetPasswordOTP: {
        type: String,
        select: false
    },
    resetPasswordExpire: {
        type: Date,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    // Add timestamps for createdAt and updatedAt
    timestamps: true,
    // This will ensure that fields not in schema will not be saved to MongoDB
    strict: true
});

// Generate unique 6-digit refId
userSchema.pre('save', async function (next) {
    if (!this.refId) {
        let isUnique = false;
        let newRefId;

        // Keep trying until we get a unique refId
        while (!isUnique) {
            // Generate a random 6-digit number
            newRefId = Math.floor(100000 + Math.random() * 900000).toString();

            // Check if this refId already exists
            const existingUser = await this.constructor.findOne({ refId: newRefId });
            if (!existingUser) {
                isUnique = true;
            }
        }

        this.refId = newRefId;
    }
    next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
});

// Method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 