
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isAuthenticated } = require('../middleware/auth');
const ForumPost = require('../models/ForumPost');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, DOC, DOCX, TXT, and ZIP are allowed.'));
  }
});

// Get all forum posts
router.get('/', async (req, res) => {
  try {
    const posts = await ForumPost.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username profilePicture')
      .populate('comments.author', 'username profilePicture');
    
    res.status(200).json({ posts });
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    res.status(500).json({ error: 'Failed to fetch forum posts' });
  }
});

// Create a new forum post
router.post('/', isAuthenticated, upload.array('attachments', 5), async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user._id || req.user.id;
    
    // Process attachments if any
    const attachments = req.files?.map(file => ({
      filename: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    })) || [];

    const newPost = new ForumPost({
      title,
      content,
      author: userId,
      attachments
    });

    await newPost.save();

    const populatedPost = await ForumPost.findById(newPost._id)
      .populate('author', 'username profilePicture');

    res.status(201).json({
      message: 'Forum post created successfully',
      post: populatedPost
    });
  } catch (error) {
    console.error('Forum post creation error:', error);
    res.status(500).json({ error: 'Failed to create forum post' });
  }
});

// Get a specific forum post
router.get('/:id', async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'username profilePicture')
      .populate('comments.author', 'username profilePicture');
    
    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    res.status(200).json({ post });
  } catch (error) {
    console.error('Error fetching forum post:', error);
    res.status(500).json({ error: 'Failed to fetch forum post' });
  }
});

// Update a forum post
router.put('/:id', isAuthenticated, upload.array('attachments', 5), async (req, res) => {
  try {
    const { title, content } = req.body;
    
    // Get existing post
    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    // Check if user is the author
    if (post.author.toString() !== (req.user._id || req.user.id).toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    // Process new attachments if any
    const newAttachments = req.files?.map(file => ({
      filename: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    })) || [];

    post.title = title;
    post.content = content;
    
    // Add new attachments to existing ones
    if (newAttachments.length > 0) {
      post.attachments = [...post.attachments, ...newAttachments];
    }
    
    await post.save();

    const updatedPost = await ForumPost.findById(post._id)
      .populate('author', 'username profilePicture')
      .populate('comments.author', 'username profilePicture');

    res.status(200).json({
      message: 'Forum post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Forum post update error:', error);
    res.status(500).json({ error: 'Failed to update forum post' });
  }
});

// Delete a forum post
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    // Check if user is the author
    if (post.author.toString() !== (req.user._id || req.user.id).toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Delete attachments from filesystem
    for (const attachment of post.attachments) {
      try {
        fs.unlinkSync(attachment.path);
      } catch (err) {
        console.error('Failed to delete attachment file:', err);
      }
    }

    await ForumPost.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Forum post deleted successfully' });
  } catch (error) {
    console.error('Forum post deletion error:', error);
    res.status(500).json({ error: 'Failed to delete forum post' });
  }
});

// Add a comment to a forum post
router.post('/:id/comments', isAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user._id || req.user.id;

    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    post.comments.push({
      content,
      author: userId
    });

    await post.save();

    const updatedPost = await ForumPost.findById(post._id)
      .populate('author', 'username profilePicture')
      .populate('comments.author', 'username profilePicture');

    res.status(201).json({
      message: 'Comment added successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Comment addition error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Like/unlike a forum post
router.post('/:id/like', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const post = await ForumPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    // Check if user already liked the post
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      // Unlike post
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
      // Like post
      post.likes.push(userId);
    }

    await post.save();

    const updatedPost = await ForumPost.findById(post._id)
      .populate('author', 'username profilePicture')
      .populate('comments.author', 'username profilePicture');

    res.status(200).json({
      message: alreadyLiked ? 'Post unliked successfully' : 'Post liked successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Post like/unlike error:', error);
    res.status(500).json({ error: 'Failed to like/unlike post' });
  }
});

module.exports = router;
