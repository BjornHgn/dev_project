const Session = require('../models/sessionModel');

const createSession = async (req, res) => {
    const { sessionId, userId } = req.body;
    try {
        const session = new Session({ sessionId, players: [userId] });
        await session.save();
        res.status(201).json({ message: 'Session created', session });
    } catch (error) {
        res.status(500).json({ error: 'Error creating session' });
    }
};

const joinSession = async (req, res) => {
    const { sessionId, userId } = req.body;
    try {
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        session.players.push(userId);
        await session.save();
        res.json({ message: 'Joined session', session });
    } catch (error) {
        res.status(500).json({ error: 'Error joining session' });
    }
};

module.exports = { createSession, joinSession };