const express = require('express');
const { generateHint } = require('../controllers/aiController');
const router = express.Router();

router.post('/generate-hint', generateHint);

module.exports = router;