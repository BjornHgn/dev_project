const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const gameRoutes = require('./routes/game');
const cors = require('cors');
const aiRoutes = require('./routes/ai');
const http = require('http');
const { Server } = require('socket.io');
const { generateHint, generateQuestion } = require('./controllers/aiController');
const adminRoutes = require('./routes/admin');
const fs = require('fs');
const path = require('path');
const Question = require('./models/questionModel');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

// Import questions function
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
    
    // Socket.io connection handling
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
    
        socket.on('joinSession', (data) => {
            const { sessionId, userId } = data;
            console.log(`User ${userId} joined session ${sessionId}`);
            socket.join(sessionId);
            socket.to(sessionId).emit('playerJoined', { userId });
        });
    
        socket.on('updateScore', (data) => {
            const { sessionId, playerName, playerScore } = data;
            io.to(sessionId).emit('scoreUpdated', { playerName, playerScore });
        });
    
        socket.on('endGame', (data) => {
            io.to(data.sessionId).emit('gameEnded', { message: 'Game has ended!' });
        });
    
        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
        });
    });
    
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(error => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});