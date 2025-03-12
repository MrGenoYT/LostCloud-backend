
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
