const express = require('express');
const { createSession, joinSession } = require('../controllers/sessionController');
const router = express.Router();

router.post('/create', createSession);
router.post('/join', joinSession);

module.exports = router;