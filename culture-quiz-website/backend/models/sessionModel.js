const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    players: [{ type: String }],
    spectators: [{ type: String }], // Add spectators array
    scores: [{ 
        playerName: String,
        score: Number
    }],
    questions: [{ type: mongoose.Schema.Types.Mixed }],
    difficulty: { type: String, default: 'medium' },
    category: { type: String, default: 'all' },
    questionCount: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);