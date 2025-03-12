
const User = require('../models/User');

// Middleware to check if user is an administrator
module.exports = async function(req, res, next) {
  try {
    // Get user from request (added by auth middleware)
    const user = await User.findById(req.user.id);
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is admin or has the specific admin email
    if (user.email === 'ankittsu2@gmail.com' || user.isAdministrator || user.role === 'admin') {
      return next();
    }
    
    // Not an admin
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  } catch (err) {
    console.error('Admin auth middleware error:', err);
    res.status(500).json({ message: 'Server error during authorization check' });
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

    // Check if user exists, is active, and is an admin
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied, admin privileges required' });
    }

    // Set user in request
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
