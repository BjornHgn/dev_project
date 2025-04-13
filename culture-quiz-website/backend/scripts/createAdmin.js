const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');

// Admin credentials - change these to your preferred values
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'adminPassword123';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/culture_quiz', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    console.log('MongoDB connected');
    
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: ADMIN_USERNAME });
        
        if (existingAdmin) {
            console.log('Admin user already exists');
        } else {
            // Hash the password
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
            
            // Create the admin user
            const admin = new User({
                username: ADMIN_USERNAME,
                password: hashedPassword,
                role: 'admin'
            });
            
            // Save the admin user
            await admin.save();
            console.log('Admin user created successfully!');
            console.log('Username:', ADMIN_USERNAME);
            console.log('Password:', ADMIN_PASSWORD);
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        mongoose.disconnect();
        console.log('MongoDB connection closed');
    }
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});