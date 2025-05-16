const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const gameRoutes = require('./routes/game');
const cors = require('cors');
const aiRoutes = require('./routes/ai');
const http = require('http');
const { Server } = require('socket.io');
const adminRoutes = require('./routes/admin');
const fs = require('fs');
const path = require('path');
const Question = require('./models/questionModel');
const questionRoutes = require('./routes/questions');
const Session = require('./models/sessionModel');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

// Function to fetch questions for a session
async function fetchQuestionsForSession(difficulty, category, questionCount) {
    try {
        let query = {};
        
        if (difficulty && difficulty !== 'all') {
            query.difficulty = difficulty;
        }
        
        if (category && category !== 'all') {
            query.category = category;
        }
        
        // Get more questions than needed to allow for shuffling
        const questions = await Question.find(query).limit(questionCount * 2);
        
        // Shuffle questions and take the requested number
        const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
        return shuffledQuestions.slice(0, questionCount);
    } catch (error) {
        console.error('Error fetching questions for session:', error);
        return [];
    }
}

// Import questions from JSON if needed
async function importQuestionsFromJSON() {
    try {
        // Check if questions already exist in the database
        const count = await Question.countDocuments();
        
        if (count === 0) {
            console.log('No questions found in database. Importing from JSON...');
            
            // Read questions from JSON file
            const questionsFilePath = path.join(__dirname, '../src/data/questions.json');
            const questionsRaw = fs.readFileSync(questionsFilePath, 'utf8');
            const questionsData = JSON.parse(questionsRaw);
            
            // Insert questions into database
            const result = await Question.insertMany(questionsData.questions);
            console.log(`Successfully imported ${result.length} questions to database`);
        } else {
            console.log(`Database already contains ${count} questions. Skipping import.`);
        }
    } catch (error) {
        console.error('Error importing questions:', error);
    }
}

// Connect to MongoDB and then import questions if needed
connectDB().then(async () => {
    // Import questions if needed
    await importQuestionsFromJSON();
    
    // Middleware
    app.use(cors());
    app.use(express.json());
    
    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/sessions', sessionRoutes);
    app.use('/api/game', gameRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/questions', questionRoutes);
    
    // Socket.io connection handling
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('joinSession', async (data) => {
            const { sessionId, userId, difficulty, category, questionCount } = data;
            console.log(`User ${userId} joined session ${sessionId}`);
            
            try {
                // Join the socket room
                socket.join(sessionId);
                
                // Find or create session
                let session = await Session.findOne({ sessionId });
                
                if (!session) {
                    // Fetch questions for new session
                    const sessionQuestions = await fetchQuestionsForSession(
                        difficulty || 'medium',
                        category || 'all',
                        questionCount || 10
                    );
                    
                    // Create a new session with questions
                    session = new Session({
                        sessionId,
                        players: [userId],
                        scores: [{ playerName: userId, score: 0 }],
                        questions: sessionQuestions,
                        difficulty: difficulty || 'medium',
                        category: category || 'all',
                        questionCount: questionCount || 10,
                        isActive: true,
                        createdAt: new Date()
                    });
                    await session.save();
                    console.log(`Created new session with ${sessionQuestions.length} questions`);
                } else {
                    // Add player if not already in session
                    if (!session.players.includes(userId)) {
                        session.players.push(userId);
                        
                        // Initialize player score
                        if (!session.scores.some(s => s.playerName === userId)) {
                            session.scores.push({ playerName: userId, score: 0 });
                        }
                        await session.save();
                    }
                }
                
                // Send the session questions to the joining player
                socket.emit('sessionQuestions', {
                    questions: session.questions,
                    currentQuestionIndex: 0
                });
                
                // Broadcast session data to all clients
                io.to(sessionId).emit('sessionUpdate', {
                    players: session.players,
                    scores: session.scores,
                    playerCount: session.players.length
                });
                
                // Notify others about the new player
                socket.to(sessionId).emit('playerJoined', { 
                    userId, 
                    playerId: socket.id,
                    playerCount: session.players.length
                });
            } catch (error) {
                console.error('Error in joinSession:', error);
            }
        });
        
        socket.on('startQuizQuestion', (data) => {
            const { sessionId, questionIndex, question } = data;
            // Broadcast to all other clients in the session
            socket.to(sessionId).emit('quizQuestionStarted', { questionIndex, question });
        });
        
        socket.on('answerSelected', (data) => {
            const { sessionId, userId, questionIndex, selectedOption, isCorrect } = data;
            socket.to(sessionId).emit('playerAnswered', { 
                userId, questionIndex, selectedOption, isCorrect 
            });
        });
    
        socket.on('updateScore', async (data) => {
            const { sessionId, playerName, playerScore } = data;
            
            try {
                // Update score in database
                const session = await Session.findOne({ sessionId });
                if (session) {
                    // Find the player's score entry
                    const playerIndex = session.scores.findIndex(s => s.playerName === playerName);
                    
                    if (playerIndex >= 0) {
                        // Update existing score
                        session.scores[playerIndex].score = playerScore;
                    } else {
                        // Add new score entry
                        session.scores.push({ playerName, score: playerScore });
                    }
                    
                    await session.save();
                    
                    // Broadcast updated scores to everyone in the session
                    io.to(sessionId).emit('sessionUpdate', {
                        players: session.players,
                        scores: session.scores,
                        playerCount: session.players.length
                    });
                }
            } catch (error) {
                console.error('Error updating score:', error);
            }
        });
    
        socket.on('endGame', (data) => {
            io.to(data.sessionId).emit('gameEnded', { message: 'Game has ended!' });
        });
    
        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
        });

        socket.on('getSessionInfo', async (data) => {
            try {
                const session = await Session.findOne({ sessionId: data.sessionId });
                if (session) {
                    socket.emit('sessionUpdate', {
                        players: session.players,
                        scores: session.scores,
                        playerCount: session.players.length
                    });
                    
                    // Also send the session questions if they exist
                    if (session.questions && session.questions.length > 0) {
                        socket.emit('sessionQuestions', {
                            questions: session.questions,
                            currentQuestionIndex: 0
                        });
                    }
                }
            } catch (error) {
                console.error('Error getting session info:', error);
            }
        });
    });
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
        console.log(`Access from other devices at http://YOUR_IP_ADDRESS:${PORT}`);
    });
}).catch(error => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});