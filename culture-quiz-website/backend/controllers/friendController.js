const User = require('../models/userModel');
const Friend = require('../models/friendModel');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// IMPORTANT: Use the same JWT_SECRET that's in your authController.js
const JWT_SECRET = 'your_jwt_secret';

/**
 * Get the friends list for the authenticated user
 */
const getFriends = async (req, res) => {
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }
        
        // Extract token
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
        
        // Get user info
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Initialize empty arrays for the response
        const friendsData = {
            friends: [],
            sentRequests: [],
            receivedRequests: []
        };
        
        // Find accepted friendships (both directions)
        const friendships = await Friend.find({
            $or: [
                { user1: userId, status: 'accepted' },
                { user2: userId, status: 'accepted' }
            ]
        }).populate('user1 user2', 'username');
        
        // Format friends data
        friendsData.friends = friendships.map(friendship => {
            const friend = friendship.user1._id.toString() === userId ? 
                friendship.user2 : friendship.user1;
            return {
                id: friend._id,
                username: friend.username,
                status: 'online', // You can implement actual status tracking later
                friendshipId: friendship._id
            };
        });
        
        // Find sent requests
        const sentRequests = await Friend.find({
            user1: userId,
            status: 'pending'
        }).populate('user2', 'username');
        
        friendsData.sentRequests = sentRequests.map(req => ({
            id: req.user2._id,
            username: req.user2.username,
            requestId: req._id
        }));
        
        // Find received requests
        const receivedRequests = await Friend.find({
            user2: userId,
            status: 'pending'
        }).populate('user1', 'username');
        
        friendsData.receivedRequests = receivedRequests.map(req => ({
            id: req.user1._id,
            username: req.user1.username,
            requestId: req._id
        }));
        
        res.status(200).json(friendsData);
        
    } catch (error) {
        console.error('Error fetching friends list:', error);
        res.status(500).json({ error: 'Error fetching friends list: ' + error.message });
    }
};

/**
 * Send a friend invitation
 */
const inviteFriend = async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }
        
        // Extract token from Authorization header
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
        
        // Find the sender
        const sender = await User.findById(senderId);
        if (!sender) {
            return res.status(404).json({ error: 'Sender user not found' });
        }
        
        // Find the recipient by username
        const recipient = await User.findOne({ username });
        if (!recipient) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if trying to add yourself
        if (sender.username === username) {
            return res.status(400).json({ error: 'You cannot add yourself as a friend' });
        }
        
        // Check if already friends
        const existingFriendship = await Friend.findOne({
            $or: [
                { user1: senderId, user2: recipient._id, status: 'accepted' },
                { user1: recipient._id, user2: senderId, status: 'accepted' }
            ]
        });
        
        if (existingFriendship) {
            return res.status(400).json({ error: 'You are already friends with this user' });
        }
        
        // Check if already sent a request
        const existingRequest = await Friend.findOne({
            user1: senderId,
            user2: recipient._id,
            status: 'pending'
        });
        
        if (existingRequest) {
            return res.status(400).json({ error: 'Friend request already sent' });
        }
        
        // Create new friend request
        const newFriendRequest = new Friend({
            user1: senderId,
            user2: recipient._id,
            status: 'pending',
            createdAt: new Date()
        });
        
        await newFriendRequest.save();
        
        res.status(200).json({ 
            message: 'Friend request sent successfully',
            request: {
                id: newFriendRequest._id,
                recipient: recipient.username
            }
        });
        
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ error: 'Error sending friend request: ' + error.message });
    }
};

/**
 * Accept a friend request
 */
const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        
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
        
        // Find the friend request
        const friendRequest = await Friend.findById(requestId);
        if (!friendRequest) {
            return res.status(404).json({ error: 'Friend request not found' });
        }
        
        // Verify the request is for this user
        if (friendRequest.user2.toString() !== userId) {
            return res.status(403).json({ error: 'You cannot accept this friend request' });
        }
        
        // Update request status
        friendRequest.status = 'accepted';
        await friendRequest.save();
        
        res.json({ 
            message: 'Friend request accepted',
            friendship: friendRequest
        });
        
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ error: 'Error accepting friend request: ' + error.message });
    }
};

/**
 * Decline a friend request
 */
const declineFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        
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
        
        // Find the friend request
        const friendRequest = await Friend.findById(requestId);
        if (!friendRequest) {
            return res.status(404).json({ error: 'Friend request not found' });
        }
        
        // Either the sender or receiver can decline/cancel a request
        if (friendRequest.user1.toString() !== userId && friendRequest.user2.toString() !== userId) {
            return res.status(403).json({ error: 'You are not authorized to decline this request' });
        }
        
        // Delete the request
        await Friend.findByIdAndDelete(requestId);
        
        res.json({ message: 'Friend request declined' });
        
    } catch (error) {
        console.error('Error declining friend request:', error);
        res.status(500).json({ error: 'Error declining friend request: ' + error.message });
    }
};

/**
 * Remove a friend
 */
const removeFriend = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        
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
        
        // Find the friendship
        const friendship = await Friend.findById(friendshipId);
        if (!friendship) {
            return res.status(404).json({ error: 'Friendship not found' });
        }
        
        // Verify the user is part of this friendship
        if (friendship.user1.toString() !== userId && friendship.user2.toString() !== userId) {
            return res.status(403).json({ error: 'You are not part of this friendship' });
        }
        
        // Delete the friendship
        await Friend.findByIdAndDelete(friendshipId);
        
        res.json({ message: 'Friend removed successfully' });
        
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ error: 'Error removing friend: ' + error.message });
    }
};

module.exports = {
    getFriends,
    inviteFriend,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend
};