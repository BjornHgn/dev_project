const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const gameRoutes = require('./routes/game');
const cors = require('cors');
const aiRoutes = require('./routes/ai');
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinSession', (data) => {
        socket.join(data.sessionId);
        console.log(`User ${data.userId} joined session ${data.sessionId}`);
    });

    socket.on('endGame', (data) => {
        io.to(data.sessionId).emit('gameEnded', { message: 'Game has ended!' });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/ai', aiRoutes);
router.post('/generate-question', generateQuestion);
router.post('/generate-hint', generateHint);

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});