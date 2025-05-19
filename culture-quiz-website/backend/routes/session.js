const express = require('express');
const router = express.Router();
const { createSession, joinSession, spectateSession, getSession } = require('../controllers/sessionController');

// Create a new session
router.post('/create', createSession);

// Join an existing session
router.post('/join', joinSession);

// Spectate an existing session
router.post('/spectate', spectateSession);

// Get session details
router.get('/:sessionId', getSession);

module.exports = router;