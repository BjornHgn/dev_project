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

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/ai', aiRoutes);

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