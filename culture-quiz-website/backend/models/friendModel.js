const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
    user1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure uniqueness of friendship pairs
friendSchema.index({ user1: 1, user2: 1 }, { unique: true });

const Friend = mongoose.model('Friend', friendSchema);

module.exports = Friend;