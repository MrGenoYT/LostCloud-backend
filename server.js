const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimiter = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const botManager = require('./botManager');
require('dotenv').config();

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lostcloud', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting
const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/lostcloud'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());
require('./middleware/passport');

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/bots', require('./routes/bots'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/help', require('./routes/help'));
app.use('/api/admin', require('./routes/admin'));

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected');

  // Authenticate socket
  socket.on('authenticate', (token) => {
    try {
      // Verify token logic here
      // This is a placeholder - in a real app, you'd verify the JWT token
      socket.join('authenticated');
      socket.emit('authenticated', true);
    } catch (error) {
      socket.emit('authenticated', false);
    }
  });

  // Join bot channel
  socket.on('join-bot', (botId) => {
    socket.join(`bot:${botId}`);
    console.log(`Socket joined bot:${botId}`);
  });

  // Handle bot commands
  socket.on('bot-command', (data) => {
    const { botId, command, params } = data;
    botManager.sendCommand(botId, command, params, (response) => {
      socket.emit('bot-response', response);
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Import and use error handler middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize bot manager
  botManager.init(io);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});