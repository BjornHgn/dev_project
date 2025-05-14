const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    submitQuestion, 
    getUserSubmissions 
} = require('../controllers/questionController');

// Routes for regular users
router.post('/submit', protect, submitQuestion);
router.get('/my-submissions', protect, getUserSubmissions);

module.exports = router;