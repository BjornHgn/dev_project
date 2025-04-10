const Session = require('../models/sessionModel');
const { generateSessionId } = require('../utils/generators');

const createSession = async (req, res) => {
    const { userId } = req.body;
    
    // Add validation
    if (!userId) {
        return res.status(400).json({ error: 'UserId is required' });
    }
    
    try {
        console.log('Creating session for user:', userId);
        
        // Generate a random session ID
        const sessionId = generateSessionId();
        console.log('Generated sessionId:', sessionId);
        
        // Create and save the session with the generated ID
        const session = new Session({ 
            sessionId, 
            players: [userId],
            scores: [{ playerName: userId, score: 0 }], // Initialize with a score of 0
            isActive: true,
            createdAt: new Date()
        });
        
        console.log('Saving session:', session);
        await session.save();
        console.log('Session saved successfully');
        
        res.status(201).json({ 
            message: 'Session created successfully', 
            session: {
                id: session._id,
                sessionId: sessionId,
                players: session.players
            }
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: `Error creating session: ${error.message}` });
    }
};

const joinSession = async (req, res) => {
    const { sessionId, userId } = req.body;
    try {
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Prevent duplicate players
        if (!session.players.includes(userId)) {
            session.players.push(userId);
            await session.save();
        }
        
        res.json({ message: 'Joined session successfully', session });
    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ error: 'Error joining session' });
    }
};

module.exports = { createSession, joinSession };