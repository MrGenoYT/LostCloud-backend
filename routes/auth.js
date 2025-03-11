const express = require('express');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const verifyCaptcha = require('../middleware/captcha');
const router = express.Router();

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Signup with CAPTCHA and validation
router.post('/signup', verifyCaptcha, [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { username, email, password } = req.body;
    const newUser = new User({ username, email, password });
    await newUser.save();
    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ error: 'Login error' });
      res.json({ message: 'User created', user: newUser });
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Local login
router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Logged in', user: req.user });
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
);

// Request Password Reset
router.post('/request-password-reset', [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No user with that email' });
    // Generate token and expiry (e.g., 1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000;
    await PasswordResetToken.create({ user: user._id, token, expiresAt });
    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL}/password-reset?token=${token}&id=${user._id}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'LostCloud Password Reset',
      text: `Click the link to reset your password: ${resetLink}`
    });
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Password
router.post('/reset-password', [
  body('userId').notEmpty(),
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { userId, token, password } = req.body;
    const resetRecord = await PasswordResetToken.findOne({ user: userId, token });
    if (!resetRecord || resetRecord.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const user = await User.findById(userId);
    user.password = password;
    await user.save();
    // Remove used token
    await PasswordResetToken.deleteOne({ _id: resetRecord._id });
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => res.json({ message: 'Logged out' }));
});

module.exports = router;
