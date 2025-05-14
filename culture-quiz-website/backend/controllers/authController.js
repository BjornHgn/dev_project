const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Please provide username and password' });
    }
    
    try {
        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Hash the password with a stronger salt round (12)
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Set role to user by default
        const user = new User({ 
            username, 
            password: hashedPassword,
            role: 'user'  // Default role
        });
        
        await user.save();
        console.log('User registered successfully:', username);
        
        // Create JWT token for auto-login
        const token = jwt.sign({ 
            id: user._id, 
            role: user.role 
        }, 'your_jwt_secret', { 
            expiresIn: '1h' 
        });
        
        // Return token along with user data for auto-login
        res.status(201).json({ 
            message: 'User registered successfully',
            token,
            userId: user._id,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
};


const loginUser = async (req, res) => {
    const { username, password } = req.body;
    try {
        console.log('Login attempt for user:', username);
        
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found:', username);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('Found user with role:', user.role);
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token with user's ID and role
        const token = jwt.sign({ 
            id: user._id, 
            role: user.role 
        }, 'your_jwt_secret', { 
            expiresIn: '1h' 
        });
        
        console.log('User logged in successfully:', username, 'with role:', user.role);
        
        // Include role in the response for front-end to handle
        res.json({ 
            token,
            username: user.username,
            userId: user._id,
            role: user.role
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
};

module.exports = { registerUser, loginUser };