
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  // If user is authenticated through session
  if (req.isAuthenticated()) {
    return next();
  }

  // Check for JWT token in cookies or authorization header
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to validate reCAPTCHA
exports.validateRecaptcha = async (req, res, next) => {
  // Skip captcha validation in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const { recaptchaToken } = req.body;
  
  if (!recaptchaToken) {
    return res.status(400).json({ error: 'reCAPTCHA verification failed' });
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
    );

    if (response.data.success) {
      next();
    } else {
      return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return res.status(500).json({ error: 'reCAPTCHA verification error' });
  }
};
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');

    // Check if user exists and is active
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Set user in request
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
