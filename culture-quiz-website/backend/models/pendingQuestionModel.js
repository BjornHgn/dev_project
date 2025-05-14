const mongoose = require('mongoose');

const pendingQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: String, required: true },
    category: { type: String, default: 'general' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }, // Add this line
    imageUrl: { type: String },
    submittedBy: { 
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: { type: String, required: true }
    },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    adminFeedback: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PendingQuestion', pendingQuestionSchema);