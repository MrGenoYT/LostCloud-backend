
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Bot = require('../models/Bot');
const ForumPost = require('../models/ForumPost');

// Get dashboard stats
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    // Get counts
    const userCount = await User.countDocuments();
    const botCount = await Bot.countDocuments();
    const postCount = await ForumPost.countDocuments();
    
    // Get latest users
    const latestUsers = await User.find()
      .select('username email profilePicture createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get active bots
    const activeBots = await Bot.find({ status: 'online' })
      .populate('owner', 'username')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get latest forum posts
    const latestPosts = await ForumPost.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      counts: {
        users: userCount,
        bots: botCount,
        posts: postCount
      },
      latest: {
        users: latestUsers,
        bots: activeBots,
        posts: latestPosts
      }
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ message: 'Server error while fetching admin stats' });
  }
});

// Get all users (with pagination)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments();
    
    // Get users
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      users,
      pagination: {
        total: totalUsers,
        page,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// Get all bots (with pagination)
router.get('/bots', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalBots = await Bot.countDocuments();
    
    // Get bots
    const bots = await Bot.find()
      .populate('owner', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      bots,
      pagination: {
        total: totalBots,
        page,
        pages: Math.ceil(totalBots / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching bots:', err);
    res.status(500).json({ message: 'Server error while fetching bots' });
  }
});

// Get all forum posts (with pagination)
router.get('/posts', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalPosts = await ForumPost.countDocuments();
    
    // Get posts
    const posts = await ForumPost.find()
      .populate('author', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      posts,
      pagination: {
        total: totalPosts,
        page,
        pages: Math.ceil(totalPosts / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ message: 'Server error while fetching posts' });
  }
});

// Update user (admin can update any user)
router.put('/users/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { username, email, role, isAdministrator } = req.body;
    const updateData = {};
    
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role && ['user', 'moderator', 'admin'].includes(role)) updateData.role = role;
    if (isAdministrator !== undefined) updateData.isAdministrator = isAdministrator;
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error while updating user' });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', auth, adminAuth, async (req, res) => {
  try {
    // Check if trying to delete admin email account
    const userToDelete = await User.findById(req.params.userId);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (userToDelete.email === 'ankittsu2@gmail.com') {
      return res.status(403).json({ message: 'Cannot delete the main administrator account' });
    }
    
    // Delete user's bots
    await Bot.deleteMany({ owner: req.params.userId });
    
    // Delete user's forum posts
    await ForumPost.deleteMany({ author: req.params.userId });
    
    // Delete user
    await User.findByIdAndDelete(req.params.userId);
    
    res.json({ message: 'User and associated data deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error while deleting user' });
  }
});

// Force-stop a bot (admin only)
router.put('/bots/:botId/stop', auth, adminAuth, async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.botId);
    
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }
    
    // Update bot status
    bot.status = 'offline';
    bot.lastStatusChange = Date.now();
    
    await bot.save();
    
    // Here you would also send a signal to your bot manager to stop the bot
    // This is a placeholder for that logic
    
    res.json({ message: 'Bot stopped successfully', bot });
  } catch (err) {
    console.error('Error stopping bot:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Bot not found' });
    }
    res.status(500).json({ message: 'Server error while stopping bot' });
  }
});

// System logs (admin only)
router.get('/logs', auth, adminAuth, async (req, res) => {
  try {
    // This is a placeholder - in a real application, you would fetch logs from your logging system
    const logs = [
      { timestamp: new Date(), level: 'info', message: 'System started' },
      { timestamp: new Date(Date.now() - 3600000), level: 'warning', message: 'High memory usage detected' },
      { timestamp: new Date(Date.now() - 7200000), level: 'error', message: 'Database connection error (recovered)' }
    ];
    
    res.json(logs);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ message: 'Server error while fetching logs' });
  }
});

module.exports = router;
