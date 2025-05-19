const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');

// GET /api/friends - Get friends list
router.get('/', friendController.getFriends);

// POST /api/friends/invite - Send a friend invitation
router.post('/invite', friendController.inviteFriend);

// For backward compatibility with older code
router.post('/send-request', friendController.inviteFriend);

// Accept a friend request
router.put('/accept/:requestId', friendController.acceptFriendRequest);

// Decline a friend request
router.delete('/decline/:requestId', friendController.declineFriendRequest);

// Remove a friend
router.delete('/remove/:friendshipId', friendController.removeFriend);

module.exports = router;