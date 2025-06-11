const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createOTPValidator } = require('../middleware/validators');
const otpController = require('../controllers/otp.controller');

// Admin routes
router.get('/', protect, authorize('admin'), otpController.getCurrentOTP);
router.post('/', protect, authorize('admin'), createOTPValidator, otpController.createOTP);
router.delete('/:type', protect, authorize('admin'), otpController.deactivateOTP);

module.exports = router; 