const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: String, required: true },
    imageUrl: { type: String }, // Optional image URL
    category: { type: String }, // Optional category
});

module.exports = mongoose.model('Question', questionSchema);