const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const ForumPost = require('../models/ForumPost');
const User = require('../models/User');

// Helper function to check admin status
const isAdmin = async (req) => {
  if (!req.user) return false;
  const user = await User.findById(req.user.id);
  return user && (user.email === 'ankittsu2@gmail.com' || user.isAdministrator);
};

// Get all forum posts
router.get('/', async (req, res) => {
  try {
    const filter = {};
    const sort = { isPinned: -1, createdAt: -1 };

    // Apply category filter if provided
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Apply search query if provided
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const posts = await ForumPost.find(filter)
      .sort(sort)
      .populate('author', 'username profilePicture isAdministrator')
      .populate({
        path: 'comments.author',
        select: 'username profilePicture isAdministrator'
      })
      .exec();

    res.json(posts);
  } catch (err) {
    console.error('Error getting forum posts:', err);
    res.status(500).json({ message: 'Server error while fetching forum posts' });
  }
});

// Get a specific forum post by ID
router.get('/:id', async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'username profilePicture isAdministrator')
      .populate({
        path: 'comments.author',
        select: 'username profilePicture isAdministrator'
      })
      .exec();

    if (!post) {
      return res.status(404).json({ message: 'Forum post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error('Error getting forum post:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Forum post not found' });
    }
    res.status(500).json({ message: 'Server error while fetching forum post' });
  }
});

// Create a new forum post
router.post(
  '/',
  auth,
  [
    check('title', 'Title is required (5-100 characters)').isLength({ min: 5, max: 100 }),
    check('content', 'Content is required (minimum 10 characters)').isLength({ min: 10 }),
    check('category', 'Valid category is required').isIn(['General', 'Help', 'Tutorials', 'Suggestions', 'Bug Reports', 'Announcements'])
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, content, category, tags } = req.body;

      // Create new post
      const newPost = new ForumPost({
        title,
        content,
        category,
        tags: tags || [],
        author: req.user.id,
      });

      // Save post
      const post = await newPost.save();

      // Update user's posts array
      await User.findByIdAndUpdate(
        req.user.id,
        { $push: { forumPosts: post._id } }
      );

      // Populate author
      await post.populate('author', 'username profilePicture isAdministrator');

      res.status(201).json(post);
    } catch (err) {
      console.error('Error creating forum post:', err);
      res.status(500).json({ message: 'Server error while creating forum post' });
    }
  }
);

// Add a comment to a forum post
router.post(
  '/:id/comments',
  auth,
  [
    check('content', 'Comment content is required').not().isEmpty()
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const post = await ForumPost.findById(req.params.id);

      if (!post) {
        return res.status(404).json({ message: 'Forum post not found' });
      }

      // Create new comment
      const newComment = {
        content: req.body.content,
        author: req.user.id
      };

      // Add comment to post
      post.comments.push(newComment);
      post.updatedAt = Date.now();

      // Save post with new comment
      await post.save();

      // Populate comment author information
      await ForumPost.populate(post, {
        path: 'comments.author',
        select: 'username profilePicture isAdministrator',
        options: { sort: { 'comments.createdAt': -1 } }
      });

      // Return only the new comment
      const addedComment = post.comments[post.comments.length - 1];

      res.status(201).json(addedComment);
    } catch (err) {
      console.error('Error adding comment:', err);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Forum post not found' });
      }
      res.status(500).json({ message: 'Server error while adding comment' });
    }
  }
);

// Like/unlike a forum post
router.put('/:id/like', auth, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Forum post not found' });
    }

    // Check if already liked
    const alreadyLiked = post.likes.some(like => like.toString() === req.user.id);

    if (alreadyLiked) {
      // Unlike the post
      post.likes = post.likes.filter(like => like.toString() !== req.user.id);
    } else {
      // Like the post
      post.likes.push(req.user.id);
    }

    // Save updated post
    await post.save();

    res.json({ likes: post.likes, likeCount: post.likes.length });
  } catch (err) {
    console.error('Error liking/unliking post:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Forum post not found' });
    }
    res.status(500).json({ message: 'Server error while updating likes' });
  }
});

// Update a forum post (Only author or admin)
router.put(
  '/:id',
  auth,
  [
    check('title', 'Title is required (5-100 characters)').isLength({ min: 5, max: 100 }),
    check('content', 'Content is required (minimum 10 characters)').isLength({ min: 10 })
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const post = await ForumPost.findById(req.params.id);

      if (!post) {
        return res.status(404).json({ message: 'Forum post not found' });
      }

      // Check if user is the author or an admin
      const user = await User.findById(req.user.id);
      const isAuthor = post.author.toString() === req.user.id;
      const isAdmin = user.email === 'ankittsu2@gmail.com' || user.isAdministrator;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ message: 'Not authorized to update this post' });
      }

      // Update post fields
      const { title, content, category, tags } = req.body;
      post.title = title || post.title;
      post.content = content || post.content;
      post.category = category || post.category;
      post.tags = tags || post.tags;
      post.updatedAt = Date.now();

      // Save updated post
      await post.save();

      // Populate author data
      await post.populate('author', 'username profilePicture isAdministrator');

      res.json(post);
    } catch (err) {
      console.error('Error updating forum post:', err);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Forum post not found' });
      }
      res.status(500).json({ message: 'Server error while updating forum post' });
    }
  }
);

// Pin/unpin a forum post (Admin only)
router.put('/:id/pin', auth, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Forum post not found' });
    }

    // Check if user is an admin
    const user = await User.findById(req.user.id);
    if (!isAdmin(req)) {
      return res.status(403).json({ message: 'Only administrators can pin/unpin posts' });
    }

    // Toggle pin status
    post.isPinned = !post.isPinned;

    // Save updated post
    await post.save();

    res.json({ isPinned: post.isPinned });
  } catch (err) {
    console.error('Error pinning/unpinning post:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Forum post not found' });
    }
    res.status(500).json({ message: 'Server error while pinning/unpinning post' });
  }
});

// Delete a forum post (Only author or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Forum post not found' });
    }

    // Check if user is the author or an admin
    const user = await User.findById(req.user.id);
    const isAuthor = post.author.toString() === req.user.id;
    const isAdmin = user.email === 'ankittsu2@gmail.com' || user.isAdministrator;

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Remove post from author's forumPosts array
    await User.findByIdAndUpdate(post.author, {
      $pull: { forumPosts: post._id }
    });

    // Delete post
    await post.remove();

    res.json({ message: 'Forum post deleted successfully' });
  } catch (err) {
    console.error('Error deleting forum post:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Forum post not found' });
    }
    res.status(500).json({ message: 'Server error while deleting forum post' });
  }
});

// Delete a comment (Only comment author or admin or post author)
router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Forum post not found' });
    }

    // Find comment
    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the comment author, post author or an admin
    const user = await User.findById(req.user.id);
    const isCommentAuthor = comment.author.toString() === req.user.id;
    const isPostAuthor = post.author.toString() === req.user.id;
    const isAdmin = user.email === 'ankittsu2@gmail.com' || user.isAdministrator;

    if (!isCommentAuthor && !isAdmin && !isPostAuthor) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Remove comment
    comment.remove();
    post.updatedAt = Date.now();

    // Save post without the comment
    await post.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Forum post or comment not found' });
    }
    res.status(500).json({ message: 'Server error while deleting comment' });
  }
});

module.exports = router;