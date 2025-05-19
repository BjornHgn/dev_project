const express = require('express');
const router = express.Router();
const gameInvitationController = require('../controllers/gameInvitationController');

// GET /api/game-invitations - Get all pending game invitations for the current user
router.get('/', gameInvitationController.getGameInvitations);

// POST /api/game-invitations - Send a game invitation to a friend
router.post('/', gameInvitationController.sendGameInvitation);

// PUT /api/game-invitations/accept/:invitationId - Accept a game invitation
router.put('/accept/:invitationId', gameInvitationController.acceptGameInvitation);

// PUT /api/game-invitations/decline/:invitationId - Decline a game invitation
router.put('/decline/:invitationId', gameInvitationController.declineGameInvitation);

module.exports = router;