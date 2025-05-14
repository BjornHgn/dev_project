const PendingQuestion = require('../models/pendingQuestionModel');

// Submit a new question
const submitQuestion = async (req, res) => {
    try {
        const { question, options, answer, category, imageUrl } = req.body;
        
        // Validate required fields
        if (!question || !options || !answer) {
            return res.status(400).json({ error: 'Question, options and answer are required' });
        }
        
        // Create new pending question
        const newPendingQuestion = new PendingQuestion({
            question,
            options,
            answer,
            category: category || 'general',
            imageUrl,
            submittedBy: {
                userId: req.user._id,
                username: req.user.username
            }
        });
        
        await newPendingQuestion.save();
        
        res.status(201).json({
            message: 'Question submitted successfully for admin review',
            submission: newPendingQuestion
        });
    } catch (error) {
        console.error('Error submitting question:', error);
        res.status(500).json({ error: 'Error submitting question' });
    }
};

// Get user's own submissions
const getUserSubmissions = async (req, res) => {
    try {
        const submissions = await PendingQuestion.find({ 
            'submittedBy.userId': req.user._id 
        }).sort({ createdAt: -1 });
        
        res.json(submissions);
    } catch (error) {
        console.error('Error fetching user submissions:', error);
        res.status(500).json({ error: 'Error fetching submissions' });
    }
};

module.exports = { submitQuestion, getUserSubmissions };