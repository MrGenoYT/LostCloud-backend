require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const botRoutes = require('./routes/bots');
const forumRoutes = require('./routes/forum');
const helpRoutes = require('./routes/help');
const userRoutes = require('./routes/users');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Security middleware
app.use(helmet());
app.use(rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100,
  standardHeaders: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ 
  origin: process.env.FRONTEND_URL, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session middleware with MongoStore
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretcode',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Configure passport strategies
require('./middleware/passport')(passport);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/users', userRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// Setup Socket.io for real-time updates
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  // Send bot statuses on connection
  const botManager = require('./botManager');
  const Bot = require('./models/Bot');

  // Send periodic bot status updates
  const sendBotStatuses = () => {
    Bot.find({}).then(bots => {
      const statuses = [];
      bots.forEach(bot => {
        const isOnline = !!botManager.bots[bot.serverId];
        statuses.push({
          serverId: bot.serverId,
          name: bot.name || `Bot_${bot.serverId}`,
          status: isOnline ? 'Online' : 'Offline',
          createdAt: bot.createdAt,
          ip: bot.ip,
          port: bot.port
        });
      });

      socket.emit('botStatusUpdate', statuses);
    }).catch(err => {
      console.error('Error fetching bot statuses:', err);
    });
  };

  // Send initial statuses
  sendBotStatuses();

  // Set up interval for updates
  const statusInterval = setInterval(sendBotStatuses, 10000);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(statusInterval);
  });
});


// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export bots for external use
module.exports = { app, bots };