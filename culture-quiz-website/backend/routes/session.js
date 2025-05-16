const express = require('express');
const router = express.Router();
const { createSession, joinSession, getSession } = require('../controllers/sessionController');

// Create a new session
router.post('/create', createSession);

// Join an existing session
router.post('/join', joinSession);

// Get session details
router.get('/:sessionId', getSession);

module.exports = router;