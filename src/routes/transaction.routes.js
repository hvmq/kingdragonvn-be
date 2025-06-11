const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { createTransactionValidator, updateTransactionValidator } = require('../middleware/validators');
const { protect, authorize } = require('../middleware/auth');

// Protected routes (require login)
router.use(protect);

// User transaction routes
router.post('/deposit', createTransactionValidator, transactionController.createDeposit);
router.post('/withdraw', createTransactionValidator, transactionController.createWithdraw);
router.get('/my-transactions', transactionController.getUserTransactions);

// Admin only routes
router.get('/', authorize('admin'), transactionController.getAllTransactions);
router.put('/:transactionId', authorize('admin'), updateTransactionValidator, transactionController.updateTransactionStatus);

module.exports = router; 