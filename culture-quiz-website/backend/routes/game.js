const express = require('express');
const { startGame, endGame, getQuestions, updateScore } = require('../controllers/gameController');
const router = express.Router();

router.post('/start', startGame);
router.post('/end', endGame);
router.get('/questions', getQuestions); // New route to get questions from DB
router.post('/update-score', updateScore); // New route to update scores

module.exports = router;