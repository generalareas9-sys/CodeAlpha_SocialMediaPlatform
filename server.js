const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

// Initialize database
require('./db/database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join_post', (postId) => {
    socket.join(`post_${postId}`);
  });
});

// Security & Parsing Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets & uploads
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/upload', uploadRoutes);

// Clean URL routing for frontend pages
app.get('/login', (req, res) => res.sendFile(path.join(publicPath, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(publicPath, 'register.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(publicPath, 'profile.html')));
app.get('/discover', (req, res) => res.sendFile(path.join(publicPath, 'discover.html')));
app.get('/post', (req, res) => res.sendFile(path.join(publicPath, 'post.html')));
app.get('/post/:id', (req, res) => res.sendFile(path.join(publicPath, 'post.html')));

// 404 handler for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

// Fallback for non-API client routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Linkora platform running at http://localhost:${PORT}`);
    console.log(`📁 Static files served from: ${publicPath}`);
  });
}

module.exports = app;
