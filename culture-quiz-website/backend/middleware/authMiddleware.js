const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    let token;

    // Check if token exists in authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            console.log('Processing token:', token);

            // Verify token
            const decoded = jwt.verify(token, 'your_jwt_secret');
            console.log('Decoded token:', decoded);

            // Find user by id from token, exclude password
            req.user = await User.findById(decoded.id).select('-password');
            console.log('Found user:', req.user);

            if (!req.user) {
                return res.status(404).json({ error: 'User not found' });
            }

            next();
        } catch (error) {
            console.error('Authentication error:', error);
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }
    } else {
        console.log('No authorization token provided');
        return res.status(401).json({ error: 'Not authorized, no token' });
    }
};

module.exports = { protect };