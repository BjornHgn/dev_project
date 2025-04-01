const Session = require('../models/sessionModel');

const startGame = async (req, res) => {
    const { sessionId } = req.body;
    try {
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        if (!session.isActive) return res.status(400).json({ error: 'Game has already ended' });

        // Logic to start the game
        session.isActive = true;
        await session.save();

        res.json({ message: 'Game started', session });
    } catch (error) {
        res.status(500).json({ error: 'Error starting game' });
    }
};

const endGame = async (req, res) => {
    const { sessionId } = req.body;
    try {
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        session.isActive = false;
        await session.save();

        res.json({ message: 'Game ended', session });
    } catch (error) {
        res.status(500).json({ error: 'Error ending game' });
    }
};

module.exports = { startGame, endGame };