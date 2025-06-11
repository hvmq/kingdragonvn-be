const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');

// Create a new deposit request
exports.createDeposit = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { amount } = req.body;
        const userId = req.user.id; // Assuming this comes from auth middleware

        const transaction = new Transaction({
            user: userId,
            type: 'deposit',
            amount
        });

        await transaction.save();

        res.status(201).json({
            message: 'Deposit request created successfully',
            transaction: {
                id: transaction._id,
                type: transaction.type,
                amount: transaction.amount,
                status: transaction.status,
                createdAt: transaction.createdAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new withdrawal request
exports.createWithdraw = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { amount } = req.body;
        const userId = req.user.id; // Assuming this comes from auth middleware

        // Check if user has sufficient balance
        const user = await User.findById(userId);
        if (!user || user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        const transaction = new Transaction({
            user: userId,
            type: 'withdraw',
            amount
        });

        await transaction.save();

        res.status(201).json({
            message: 'Withdrawal request created successfully',
            transaction: {
                id: transaction._id,
                type: transaction.type,
                amount: transaction.amount,
                status: transaction.status,
                createdAt: transaction.createdAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all transactions (admin only)
exports.getAllTransactions = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (type) query.type = type;

        const transactions = await Transaction.find(query)
            .populate('user', 'username phoneNumber refId')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions: transactions.map(t => ({
                id: t._id,
                type: t.type,
                amount: t.amount,
                status: t.status,
                user: t.user,
                createdAt: t.createdAt
            })),
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalTransactions: total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get user's transaction history
exports.getUserTransactions = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 10 } = req.query;
        const userId = req.user.id;

        const query = { user: userId };
        if (status) query.status = status;
        if (type) query.type = type;

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions: transactions.map(t => ({
                id: t._id,
                type: t.type,
                amount: t.amount,
                status: t.status,
                createdAt: t.createdAt
            })),
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalTransactions: total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Approve or reject transaction (admin only)
exports.updateTransactionStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { status, rejectionReason } = req.body;

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({ message: 'Transaction has already been processed' });
        }

        const user = await User.findById(transaction.user);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (status === 'approved') {
            if (transaction.type === 'deposit') {
                user.balance += transaction.amount;
            } else if (transaction.type === 'withdraw') {
                if (user.balance < transaction.amount) {
                    return res.status(400).json({ message: 'Insufficient balance' });
                }
                user.balance -= transaction.amount;
            }
            await user.save();
        }

        transaction.status = status;
        if (status === 'rejected' && rejectionReason) {
            transaction.rejectionReason = rejectionReason;
        }
        await transaction.save();

        res.json({
            message: `Transaction ${status} successfully`,
            transaction: {
                id: transaction._id,
                type: transaction.type,
                amount: transaction.amount,
                status: transaction.status,
                rejectionReason: transaction.rejectionReason,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}; 