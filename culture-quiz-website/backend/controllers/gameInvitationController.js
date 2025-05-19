const User = require('../models/userModel');
const GameInvitation = require('../models/gameInvitationModel');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Use same JWT secret as your auth controller
const JWT_SECRET = 'your_jwt_secret';

/**
 * Send a game invitation to a friend
 */
const sendGameInvitation = async (req, res) => {
    try {
        console.log('Received invitation request:', req.body);
        const { friendId, sessionId } = req.body;
        
        if (!friendId || !sessionId) {
            console.log('Missing required fields:', { friendId, sessionId });
            return res.status(400).json({ error: 'FriendId and sessionId are required' });
        }
        
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }
        
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }
        
        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            console.error('JWT verification error:', err);
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        const senderId = decoded.id;
        
        console.log('Verified sender ID:', senderId);
        
        // Check if valid sender ID
        if (!mongoose.Types.ObjectId.isValid(senderId)) {
            return res.status(400).json({ error: 'Invalid sender ID format' });
        }
        
        // Check if valid friend ID
        if (!mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(400).json({ error: 'Invalid friend ID format' });
        }
        
        // Find the sender
        const sender = await User.findById(senderId);
        if (!sender) {
            return res.status(404).json({ error: 'Sender user not found' });
        }
        
        // Find the friend (recipient)
        const friend = await User.findById(friendId);
        if (!friend) {
            return res.status(404).json({ error: 'Friend not found' });
        }
        
        console.log('Found users:', { sender: sender.username, friend: friend.username });
        
        // Check for existing invitation
        const existingInvitation = await GameInvitation.findOne({
            sender: senderId,
            recipient: friendId,
            sessionId: sessionId,
            status: 'pending'
        });
        
        if (existingInvitation) {
            console.log('Found existing invitation');
            return res.status(200).json({ 
                message: 'Game invitation already sent',
                invitation: existingInvitation
            });
        }
        
        // Create new game invitation
        const newInvitation = new GameInvitation({
            sender: senderId,
            recipient: friendId,
            sessionId: sessionId,
            senderName: sender.username,
            recipientName: friend.username,
            status: 'pending',
            createdAt: new Date()
        });
        
        await newInvitation.save();
        console.log('Created new invitation:', newInvitation._id);
        
        // If socket.io is available, emit a real-time notification
        if (req.io) {
            const recipientSocketId = req.connectedUsers ? req.connectedUsers[friendId] : null;
            if (recipientSocketId) {
                console.log('Sending real-time notification to socket:', recipientSocketId);
                req.io.to(recipientSocketId).emit('gameInvitation', {
                    invitationId: newInvitation._id,
                    sessionId: sessionId,
                    from: sender.username,
                    message: `${sender.username} invited you to join a game session!`
                });
            }
        }
        
        res.status(200).json({
            message: 'Game invitation sent successfully',
            invitation: {
                id: newInvitation._id,
                sessionId: sessionId,
                recipient: friend.username
            }
        });
        
    } catch (error) {
        console.error('Error sending game invitation:', error);
        res.status(500).json({ error: 'Error sending game invitation: ' + error.message });
    }
};

/**
 * Accept a game invitation
 */
const acceptGameInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(invitationId)) {
            return res.status(400).json({ error: 'Invalid invitation ID format' });
        }
        
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }
        
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;
        
        // Find the invitation
        const invitation = await GameInvitation.findById(invitationId);
        if (!invitation) {
            return res.status(404).json({ error: 'Game invitation not found' });
        }
        
        // Verify the invitation is for this user
        if (invitation.recipient.toString() !== userId) {
            return res.status(403).json({ error: 'This invitation is not for you' });
        }
        
        // Check if invitation is already accepted or declined
        if (invitation.status !== 'pending') {
            return res.status(400).json({ error: `Invitation already ${invitation.status}` });
        }
        
        // Update invitation status
        invitation.status = 'accepted';
        await invitation.save();
        
        // Notify sender if socket.io is available
        if (req.io && req.connectedUsers) {
            const senderSocketId = req.connectedUsers[invitation.sender.toString()];
            if (senderSocketId) {
                req.io.to(senderSocketId).emit('invitationAccepted', {
                    invitationId: invitation._id,
                    sessionId: invitation.sessionId,
                    by: invitation.recipientName || 'your friend'
                });
            }
        }
        
        res.json({
            message: 'Game invitation accepted',
            sessionId: invitation.sessionId
        });
        
    } catch (error) {
        console.error('Error accepting game invitation:', error);
        res.status(500).json({ error: 'Error accepting game invitation: ' + error.message });
    }
};

/**
 * Decline a game invitation
 */
const declineGameInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(invitationId)) {
            return res.status(400).json({ error: 'Invalid invitation ID format' });
        }
        
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }
        
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;
        
        // Find the invitation
        const invitation = await GameInvitation.findById(invitationId);
        if (!invitation) {
            return res.status(404).json({ error: 'Game invitation not found' });
        }
        
        // Verify the invitation is for this user
        if (invitation.recipient.toString() !== userId) {
            return res.status(403).json({ error: 'This invitation is not for you' });
        }
        
        // Check if invitation is already accepted or declined
        if (invitation.status !== 'pending') {
            return res.status(400).json({ error: `Invitation already ${invitation.status}` });
        }
        
        // Update invitation status
        invitation.status = 'declined';
        await invitation.save();
        
        // Notify sender if socket.io is available
        if (req.io && req.connectedUsers) {
            const senderSocketId = req.connectedUsers[invitation.sender.toString()];
            if (senderSocketId) {
                req.io.to(senderSocketId).emit('invitationDeclined', {
                    invitationId: invitation._id,
                    by: invitation.recipientName || 'your friend'
                });
            }
        }
        
        res.json({ message: 'Game invitation declined' });
        
    } catch (error) {
        console.error('Error declining game invitation:', error);
        res.status(500).json({ error: 'Error declining game invitation: ' + error.message });
    }
};

/**
 * Get all pending game invitations for the current user
 */
const getGameInvitations = async (req, res) => {
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }
        
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }
        
        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            console.error('JWT verification error:', err);
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        const userId = decoded.id;
        
        // Find pending invitations for this user
        const invitations = await GameInvitation.find({
            recipient: userId,
            status: 'pending'
        }).populate('sender', 'username');
        
        res.json({
            invitations: invitations.map(inv => ({
                id: inv._id,
                sessionId: inv.sessionId,
                from: inv.senderName || inv.sender?.username || 'A friend',
                createdAt: inv.createdAt
            }))
        });
        
    } catch (error) {
        console.error('Error fetching game invitations:', error);
        res.status(500).json({ error: 'Error fetching game invitations: ' + error.message });
    }
};

module.exports = {
    sendGameInvitation,
    acceptGameInvitation,
    declineGameInvitation,
    getGameInvitations
};