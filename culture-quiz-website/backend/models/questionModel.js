const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: String, required: true },
    category: { type: String, default: 'general' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    imageUrl: { type: String }
});

module.exports = mongoose.model('Question', questionSchema);