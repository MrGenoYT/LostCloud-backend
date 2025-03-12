
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage for profile pictures
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = 'uploads/profile';
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    cb(null, `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter for profile pictures
const fileFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: fileFilter
});

// Get current user's profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('bots', 'name serverIP status')
      .populate({
        path: 'forumPosts',
        select: 'title createdAt likes comments',
        options: { sort: { createdAt: -1 }, limit: 5 }
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// Get user by ID (public profile)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -googleId -resetPasswordToken -resetPasswordExpires')
      .populate({
        path: 'forumPosts',
        select: 'title createdAt likes comments',
        options: { sort: { createdAt: -1 }, limit: 10 }
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// Update user profile
router.put(
  '/profile',
  auth,
  [
    check('username', 'Username is required (3-20 characters)').optional().isLength({ min: 3, max: 20 }),
    check('bio', 'Bio cannot exceed 500 characters').optional().isLength({ max: 500 })
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, bio } = req.body;
      const updateData = {};
      
      // Only add fields that need to be updated
      if (username) {
        // Check if username is already taken
        const existingUser = await User.findOne({ username, _id: { $ne: req.user.id } });
        if (existingUser) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
        updateData.username = username;
      }
      
      if (bio !== undefined) {
        updateData.bio = bio;
      }
      
      // Update user
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true }
      ).select('-password');
      
      res.json(user);
    } catch (err) {
      console.error('Error updating profile:', err);
      res.status(500).json({ message: 'Server error while updating profile' });
    }
  }
);

// Upload profile picture
router.post('/profile/picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Get file path relative to server
    const profilePicturePath = `/${req.file.path.replace(/\\/g, '/')}`;
    
    // Update user with new profile picture
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { profilePicture: profilePicturePath } },
      { new: true }
    ).select('-password');
    
    res.json({ 
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture
    });
  } catch (err) {
    console.error('Error uploading profile picture:', err);
    res.status(500).json({ message: 'Server error while uploading profile picture' });
  }
});

// Change password
router.put(
  '/password',
  auth,
  [
    check('currentPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 8 characters').isLength({ min: 8 })
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      
      // Get user
      const user = await User.findById(req.user.id);
      
      // Check if user exists
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if current password is correct
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ message: 'New password must be different from current password' });
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      console.error('Error changing password:', err);
      res.status(500).json({ message: 'Server error while changing password' });
    }
  }
);

// Administrator route - Get all users (admin only)
router.get('/admin/all-users', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.email !== 'ankittsu2@gmail.com' && !user.isAdministrator) {
      return res.status(403).json({ message: 'Not authorized to access admin routes' });
    }
    
    // Get all users
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// Administrator route - Update user role (admin only)
router.put('/admin/update-role/:userId', auth, async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.user.id);
    if (admin.email !== 'ankittsu2@gmail.com' && !admin.isAdministrator) {
      return res.status(403).json({ message: 'Not authorized to update user roles' });
    }
    
    const { role } = req.body;
    
    // Validate role
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }
    
    // Update user role
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { role } },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error updating user role:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error while updating user role' });
  }
});

module.exports = router;
