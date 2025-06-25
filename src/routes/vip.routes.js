const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateVipPurchase, validateGrantVip } = require('../middleware/validators');
const vipController = require('../controllers/vip.controller');

// Get all VIP packages (authenticated)
router.get('/packages', protect, vipController.getAllPackages);

// Purchase VIP package (authenticated)
router.post('/purchase', protect, validateVipPurchase, vipController.purchasePackage);

// Get user's VIP status (authenticated)
router.get('/status', protect, vipController.getVipStatus);

// === ADMIN ROUTES ===

// Get all users with VIP packages (Admin only)
router.get('/admin/users', protect, authorize('admin'), vipController.getAllVipUsers);

// Get VIP status for any user (Admin only)
router.get('/admin/users/:userId/status', protect, authorize('admin'), vipController.getUserVipStatus);

// Cancel VIP for any user (Admin only)
router.delete('/admin/users/:userId/cancel', protect, authorize('admin'), vipController.cancelUserVip);

// Grant VIP package to any user (Admin only)
router.post('/admin/grant', protect, authorize('admin'), validateGrantVip, vipController.grantUserVip);

module.exports = router; 