
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = (passport) => {
  // Local Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if password matches
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if user is verified
        if (!user.isVerified) {
          return done(null, false, { message: 'Please verify your email before logging in' });
        }

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
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        return done(null, user);
      }

      // Check if user exists with the same email
      user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // Update existing user with Google ID
        user.googleId = profile.id;
        await user.save();
        return done(null, user);
      }

      // Create new user
      const newUser = new User({
        username: profile.displayName.replace(/\s+/g, '_').toLowerCase() + '_' + Math.floor(Math.random() * 1000),
        email: profile.emails[0].value,
        password: Math.random().toString(36).slice(-8), // Random password
        googleId: profile.id,
        profilePicture: profile.photos[0].value,
        isVerified: true // Google accounts are pre-verified
      });

      await newUser.save();
      return done(null, newUser);
    } catch (err) {
      return done(err);
    }
  }));

  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
