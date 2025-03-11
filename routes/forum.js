const express = require('express');
const { body, validationResult } = require('express-validator');
const Forum = require('../models/Forum');
const isAuthenticated = require('../middleware/authMiddleware');
const router = express.Router();

// Create a forum post
router.post('/post', isAuthenticated, [
  body('title').notEmpty(),
  body('content').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const post = await Forum.create({ user: req.user._id, title: req.body.title, content: req.body.content });
    res.json({ message: 'Post created', post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all forum posts
router.get('/posts', async (req, res) => {
  try {
    const posts = await Forum.find().populate('user', 'username').sort({ createdAt: -1 });
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
