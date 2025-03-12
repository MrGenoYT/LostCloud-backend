const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Bot = require('../models/Bot');
const ForumPost = require('../models/ForumPost');
const adminAuth = require('../middleware/adminAuth');

// Get all users (admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { username, email, role, isActive } = req.body;

    // Find user
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json(await User.findById(req.params.id).select('-password'));
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all bots (admin only)
router.get('/bots', adminAuth, async (req, res) => {
  try {
    const bots = await Bot.find().populate('owner', 'username');
    res.json(bots);
  } catch (err) {
    console.error('Error fetching bots:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete bot (admin only)
router.delete('/bots/:id', adminAuth, async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }

    await Bot.findByIdAndDelete(req.params.id);

    res.json({ message: 'Bot deleted successfully' });
  } catch (err) {
    console.error('Error deleting bot:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get site statistics (admin only)
router.get('/statistics', adminAuth, async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const botCount = await Bot.countDocuments();
    const forumPostCount = await ForumPost.countDocuments();

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const botsByStatus = await Bot.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const forumPostsByCategory = await ForumPost.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) }
    });

    const newBotsThisMonth = await Bot.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) }
    });

    res.json({
      totalUsers: userCount,
      totalBots: botCount,
      totalForumPosts: forumPostCount,
      usersByRole,
      botsByStatus,
      forumPostsByCategory,
      newUsersThisMonth,
      newBotsThisMonth
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reported content (admin only)
router.get('/reported', adminAuth, async (req, res) => {
  try {
    // This is a placeholder - you would implement actual report fetching logic
    const reportedPosts = await ForumPost.find({ isReported: true })
      .populate('author', 'username');

    res.json(reportedPosts);
  } catch (err) {
    console.error('Error fetching reported content:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export the router
module.exports = router;