const express = require('express');
const { startGame, endGame } = require('../controllers/gameController');
const router = express.Router();

router.post('/start', startGame);
router.post('/end', endGame);

module.exports = router;