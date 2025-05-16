const Session = require('../models/sessionModel');
const Question = require('../models/questionModel');
const { generateSessionId } = require('../utils/generators');

const createSession = async (req, res) => {
    const { userId, difficulty, category, questionCount } = req.body;
    
    // Add validation
    if (!userId) {
        return res.status(400).json({ error: 'UserId is required' });
    }
    
    try {
        console.log('Creating session for user:', userId);
        
        // Generate a random session ID
        const sessionId = generateSessionId();
        console.log('Generated sessionId:', sessionId);
        
        // Fetch questions for the session
        let query = {};
        if (difficulty && difficulty !== 'all') {
            query.difficulty = difficulty;
        }
        if (category && category !== 'all') {
            query.category = category;
        }
        
        const questions = await Question.find(query).limit((questionCount || 10) * 2);
        const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffledQuestions.slice(0, questionCount || 10);
        
        // Create and save the session with the generated ID and questions
        const session = new Session({ 
            sessionId, 
            players: [userId],
            scores: [{ playerName: userId, score: 0 }],
            questions: selectedQuestions,
            difficulty: difficulty || 'medium',
            category: category || 'all',
            questionCount: questionCount || 10,
            isActive: true,
            createdAt: new Date()
        });
        
        console.log('Saving session with questions:', session.questions.length);
        await session.save();
        console.log('Session saved successfully');
        
        res.status(201).json({ 
            message: 'Session created successfully', 
            session: {
                id: session._id,
                sessionId: sessionId,
                players: session.players,
                questionCount: session.questions.length
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
            
            // Initialize score for the player
            if (!session.scores.some(s => s.playerName === userId)) {
                session.scores.push({ playerName: userId, score: 0 });
            }
            
            await session.save();
        }
        
        res.json({ 
            message: 'Joined session successfully', 
            session: {
                sessionId: session.sessionId,
                players: session.players,
                questionCount: session.questions.length
            }
        });
    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ error: 'Error joining session' });
    }
};

// Get session data by ID
const getSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        res.json(session);
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Error getting session' });
    }
};

module.exports = { createSession, joinSession, getSession };