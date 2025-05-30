const Question = require('../models/questionModel');
const Session = require('../models/sessionModel');

// Start a new game
const startGame = async (req, res) => {
    try {
        const { sessionId, userId, difficulty, category } = req.body;
        
        // Get questions based on filters
        let query = {};
        
        if (difficulty && difficulty !== 'all') {
            query.difficulty = difficulty;
        }
        
        if (category && category !== 'all') {
            query.category = category;
        }
        
        const questions = await Question.find(query).limit(20);
        
        // Create or update session
        let session = await Session.findOne({ sessionId });
        
        if (!session) {
            session = new Session({
                sessionId,
                players: [userId],
                scores: [{ playerName: userId, score: 0 }],
                questions,
                difficulty,
                category,
                isActive: true
            });
        } else {
            if (!session.players.includes(userId)) {
                session.players.push(userId);
                session.scores.push({ playerName: userId, score: 0 });
            }
        }
        
        await session.save();
        
        res.json({ 
            message: 'Game started', 
            sessionId,
            questionCount: questions.length
        });
    } catch (error) {
        console.error('Error starting game:', error);
        res.status(500).json({ error: 'Error starting game' });
    }
};

// End a game
const endGame = async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        session.isActive = false;
        await session.save();
        
        res.json({ message: 'Game ended', session });
    } catch (error) {
        res.status(500).json({ error: 'Error ending game' });
    }
};

// Get questions from the database with filtering
const getQuestions = async (req, res) => {
    try {
        const { difficulty, category } = req.query;
        let query = {};
        
        if (difficulty && difficulty !== 'all') {
            query.difficulty = difficulty;
        }
        
        if (category && category !== 'all') {
            query.category = category;
        }
        
        console.log('Database query:', query);
        const questions = await Question.find(query);
        console.log(`Found ${questions.length} questions matching the criteria`);
        res.json({ questions });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ error: 'Error fetching questions' });
    }
};

// Update scores in the database
const updateScore = async (req, res) => {
    const { sessionId, playerName, score } = req.body;
    
    try {
        // Find the session
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        // Find if player already has a score
        const playerScoreIndex = session.scores?.findIndex(s => s.playerName === playerName);
        
        if (playerScoreIndex > -1) {
            // Update existing score
            session.scores[playerScoreIndex].score = score;
        } else {
            // Add new score
            if (!session.scores) session.scores = [];
            session.scores.push({ playerName, score });
        }
        
        await session.save();
        res.json({ message: 'Score updated', session });
    } catch (error) {
        console.error('Error updating score:', error);
        res.status(500).json({ error: 'Error updating score' });
    }
};

module.exports = { startGame, endGame, getQuestions, updateScore };