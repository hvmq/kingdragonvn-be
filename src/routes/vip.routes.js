const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateVipPurchase } = require('../middleware/validators');
const vipController = require('../controllers/vip.controller');

// Get all VIP packages (authenticated)
router.get('/packages', protect, vipController.getAllPackages);

// Purchase VIP package (authenticated)
router.post('/purchase', protect, validateVipPurchase, vipController.purchasePackage);

// Get user's VIP status (authenticated)
router.get('/status', protect, vipController.getVipStatus);

module.exports = router; 