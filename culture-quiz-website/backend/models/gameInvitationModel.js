const mongoose = require('mongoose');

const gameInvitationSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: String,
        required: true
    },
    senderName: {
        type: String,
        required: false
    },
    recipientName: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Auto-delete after 1 hour
    }
});

// Index for faster lookups
gameInvitationSchema.index({ sender: 1, recipient: 1, sessionId: 1, status: 1 });

const GameInvitation = mongoose.model('GameInvitation', gameInvitationSchema);

module.exports = GameInvitation;