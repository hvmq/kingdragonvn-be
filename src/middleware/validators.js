const { check, body } = require('express-validator');
const mongoose = require('mongoose');

exports.registerValidator = [
    check('username')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),
    check('phoneNumber')
        .trim()
        .matches(/^(0|84|\+84)?[35789][0-9]{8}$/)
        .withMessage('Please provide a valid Vietnamese phone number'),
    check('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    check('otp')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits')
];

exports.loginValidator = [
    check('phoneNumber')
        .trim()
        .matches(/^(0|84|\+84)?[35789][0-9]{8}$/)
        .withMessage('Please provide a valid Vietnamese phone number'),
    check('password')
        .exists()
        .withMessage('Password is required')
];

exports.forgotPasswordValidator = [
    check('phoneNumber')
        .trim()
        .matches(/^(0|84|\+84)?[35789][0-9]{8}$/)
        .withMessage('Please provide a valid Vietnamese phone number')
];

exports.resetPasswordValidator = [
    check('phoneNumber')
        .trim()
        .matches(/^(0|84|\+84)?[35789][0-9]{8}$/)
        .withMessage('Please provide a valid Vietnamese phone number'),
    check('otp')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits'),
    check('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
];

exports.createTransactionValidator = [
    check('amount')
        .isFloat({ min: 1 })
        .withMessage('Amount must be at least 1')
];

exports.updateTransactionValidator = [
    check('status')
        .isIn(['approved', 'rejected'])
        .withMessage('Status must be either approved or rejected')
];

exports.validateVipPurchase = [
    body('packageId')
        .notEmpty()
        .withMessage('Package ID is required')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid package ID');
            }
            return true;
        })
];

exports.createOTPValidator = [
    check('type')
        .isIn(['register', 'reset-password'])
        .withMessage('Invalid OTP type'),
    check('value')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits')
]; 