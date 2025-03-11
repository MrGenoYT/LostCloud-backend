const express = require('express');
const http = require('http'); // Required for WebSockets
const { Server } = require('socket.io'); // WebSockets
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { bots } = require('./botManager');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

// WebSocket connection for real-time bot status
io.on('connection', (socket) => {
  console.log('New WebSocket client connected');

  // Send bot status updates every 10 seconds
  setInterval(() => {
    const botStatuses = Object.keys(bots).map(serverId => ({
      serverId,
      status: bots[serverId] ? 'Online' : 'Offline'
    }));
    socket.emit('botStatusUpdate', botStatuses);
  }, 10000);
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Security middleware
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

// Session middleware with MongoStore
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretcode',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 }
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');

// Local Login Strategy
passport.use(new LocalStrategy({ usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: 'User not found' });
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return done(null, false, { message: 'Incorrect password' });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try { 
    const user = await User.findById(id);
    done(null, user);
  } catch (err) { done(err); }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bots', require('./routes/bots'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/help', require('./routes/help'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
