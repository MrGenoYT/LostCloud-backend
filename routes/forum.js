const express = require('express');
const router = express.Router();
const ForumPost = require('../models/ForumPost');
const auth = require('../middleware/auth');

// Get all forum posts
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;

    const query = category ? { category } : {};

    const posts = await ForumPost.find(query)
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ForumPost.countDocuments(query);

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalPosts: total
    });
  } catch (err) {
    console.error('Error fetching forum posts:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific forum post
router.get('/:id', async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'username')
      .populate('comments.author', 'username');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.views += 1;
    await post.save();

    res.json(post);
  } catch (err) {
    console.error('Error fetching forum post:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new forum post
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category } = req.body;

    const newPost = new ForumPost({
      title,
      content,
      category,
      author: req.user.id
    });

    await newPost.save();

    res.status(201).json(newPost);
  } catch (err) {
    console.error('Error creating forum post:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a forum post
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, category } = req.body;

    // Find post and check ownership
    let post = await ForumPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author or an admin
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    // Update post
    post.title = title || post.title;
    post.content = content || post.content;
    post.category = category || post.category;
    post.updatedAt = Date.now();

    await post.save();

    res.json(post);
  } catch (err) {
    console.error('Error updating forum post:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a forum post
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find post and check ownership
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author or an admin
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Delete post
    await ForumPost.findByIdAndDelete(req.params.id);

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting forum post:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a comment to a post
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;

    const post = await ForumPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add comment
    post.comments.push({
      content,
      author: req.user.id
    });

    await post.save();

    // Populate author data for the new comment
    await post.populate('comments.author', 'username');

    res.status(201).json(post.comments[post.comments.length - 1]);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment
router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Find comment
    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the comment author or an admin
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Remove comment
    comment.remove();
    await post.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export the router
module.exports = router;