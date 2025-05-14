const express = require('express');
const router = express.Router();
const Question = require('../models/questionModel');
const User = require('../models/userModel');
const Session = require('../models/sessionModel');
const { protect } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const PendingQuestion = require('../models/pendingQuestionModel');

// Define isAdmin middleware BEFORE using it
const isAdmin = async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin rights required.' });
    }
};

// Apply middlewares in the correct order
router.use(protect);
router.use(isAdmin);

// Dashboard statistics
router.get('/stats', adminController.getDashboardStats);

// Questions routes
router.get('/questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching questions' });
    }
});

router.post('/questions', adminController.createQuestion);
router.put('/questions/:id', adminController.updateQuestion);
router.delete('/questions/:id', adminController.deleteQuestion);

// Users routes
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // Exclude passwords
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users' });
    }
});

router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Sessions routes
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await Session.find().sort({ createdAt: -1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching sessions' });
    }
});

router.delete('/sessions/:id', async (req, res) => {
    try {
        const session = await Session.findByIdAndDelete(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting session' });
    }
});

// Import questions from JSON to DB
router.post('/import-questions', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Read questions from JSON file
        const questionsFilePath = path.join(__dirname, '../../src/data/questions.json');
        const fileContent = fs.readFileSync(questionsFilePath, 'utf8');
        
        // Remove comments (lines starting with //)
        const jsonContent = fileContent.replace(/^\s*\/\/.*$/gm, '');
        
        // Parse JSON content
        const questionsData = JSON.parse(jsonContent);
        
        // Clear existing questions
        await Question.deleteMany({});
        
        // Insert new questions
        const result = await Question.insertMany(questionsData.questions);
        
        res.json({ 
            success: true, 
            message: `Successfully imported ${result.length} questions`,
            count: result.length
        });
    } catch (error) {
        console.error('Error importing questions:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

router.get('/pending-questions', async (req, res) => {
    try {
        const pendingQuestions = await PendingQuestion.find({ status: 'pending' })
            .sort({ createdAt: -1 });
        res.json(pendingQuestions);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching pending questions' });
    }
});

router.put('/pending-questions/:id/approve', adminController.approveQuestion);
router.put('/pending-questions/:id/reject', adminController.rejectQuestion);

module.exports = router;