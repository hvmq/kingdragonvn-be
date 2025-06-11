const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Protect routes - verify token
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Get token from Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                message: 'Not authorized to access this route. Please login first.'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(401).json({
                    message: 'User not found with this token'
                });
            }

            // Add user to request object
            req.user = {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                refId: user.refId,
                role: user.role
            };
            next();
        } catch (error) {
            return res.status(401).json({
                message: 'Invalid token. Please login again.'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Grant access to specific roles
exports.authorize = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({
                message: `Only ${role} can access this route`
            });
        }
        next();
    };
}; 