const Question = require('../models/questionModel');
const User = require('../models/userModel');
const Session = require('../models/sessionModel');
const bcrypt = require('bcrypt');
const PendingQuestion = require('../models/pendingQuestionModel');

// Dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        const questionCount = await Question.countDocuments();
        const userCount = await User.countDocuments();
        const sessionCount = await Session.countDocuments({ isActive: true });
        
        const recentSessions = await Session.find()
            .sort({ createdAt: -1 })
            .limit(5);
            
        res.json({
            stats: {
                questions: questionCount,
                users: userCount,
                activeSessions: sessionCount
            },
            recentSessions
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ error: 'Error getting dashboard statistics' });
    }
};

// Question Management
const createQuestion = async (req, res) => {
    try {
        const newQuestion = new Question(req.body);
        await newQuestion.save();
        res.status(201).json({ 
            message: 'Question created successfully',
            question: newQuestion
        });
    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({ error: 'Error creating question' });
    }
};

const updateQuestion = async (req, res) => {
    const { id } = req.params;
    try {
        const question = await Question.findByIdAndUpdate(id, req.body, { new: true });
        if (!question) return res.status(404).json({ error: 'Question not found' });
        
        res.json({ 
            message: 'Question updated successfully',
            question
        });
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ error: 'Error updating question' });
    }
};

const deleteQuestion = async (req, res) => {
    const { id } = req.params;
    try {
        const question = await Question.findByIdAndDelete(id);
        if (!question) return res.status(404).json({ error: 'Question not found' });
        
        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: 'Error deleting question' });
    }
};

// User Management
const createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = new User({ 
            username, 
            password: hashedPassword,
            role: role || 'user',
            createdAt: new Date()
        });
        
        await newUser.save();
        
        // Don't return password in response
        const userResponse = { 
            _id: newUser._id, 
            username: newUser.username, 
            role: newUser.role,
            createdAt: newUser.createdAt
        };
        
        res.status(201).json({ 
            message: 'User created successfully',
            user: userResponse
        });
        
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    try {
        const { username, password, role } = req.body;
        
        // Check if username is already taken by another user
        if (username) {
            const existingUser = await User.findOne({ username, _id: { $ne: id } });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }
        }
        
        // Prepare update object
        const updateData = {};
        if (username) updateData.username = username;
        if (role) updateData.role = role;
        
        // If password is provided, hash it
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        
        const user = await User.findByIdAndUpdate(id, updateData, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Don't return password in response
        const userResponse = { 
            _id: user._id, 
            username: user.username, 
            role: user.role,
            createdAt: user.createdAt
        };
        
        res.json({ 
            message: 'User updated successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Error updating user' });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
};

// Add these functions to your exports
const approveQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the pending question
        const pendingQuestion = await PendingQuestion.findById(id);
        if (!pendingQuestion) {
            return res.status(404).json({ error: 'Pending question not found' });
        }
        
        // Create a new question from the pending question
        const newQuestion = new Question({
            question: pendingQuestion.question,
            options: pendingQuestion.options,
            answer: pendingQuestion.answer,
            category: pendingQuestion.category,
            imageUrl: pendingQuestion.imageUrl
        });
        
        await newQuestion.save();
        
        // Update the pending question status
        pendingQuestion.status = 'approved';
        await pendingQuestion.save();
        
        res.json({ 
            message: 'Question approved and added to database',
            question: newQuestion
        });
    } catch (error) {
        console.error('Error approving question:', error);
        res.status(500).json({ error: 'Error approving question' });
    }
};

const rejectQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;
        
        // Find and update the pending question
        const pendingQuestion = await PendingQuestion.findByIdAndUpdate(
            id,
            { 
                status: 'rejected',
                adminFeedback: feedback || 'Does not meet our quality guidelines.' 
            },
            { new: true }
        );
        
        if (!pendingQuestion) {
            return res.status(404).json({ error: 'Pending question not found' });
        }
        
        res.json({ 
            message: 'Question rejected',
            question: pendingQuestion
        });
    } catch (error) {
        console.error('Error rejecting question:', error);
        res.status(500).json({ error: 'Error rejecting question' });
    }
};

// Export all functions
module.exports = {
    getDashboardStats,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createUser,
    updateUser,
    deleteUser,
    approveQuestion,
    rejectQuestion    
};