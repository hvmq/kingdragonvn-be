const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    register,
    login,
    forgotPassword,
    resetPassword,
    getProfile,
    getAllUsers,
    searchUsers
} = require('../controllers/auth.controller');
const {
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator
} = require('../middleware/validators');

// Public routes
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);
router.post('/reset-password', resetPasswordValidator, resetPassword);

// Protected routes
router.get('/profile', protect, getProfile);

// Admin routes
router.get('/users', protect, authorize('admin'), getAllUsers);
router.get('/users/search', protect, authorize('admin'), searchUsers);

module.exports = router; 