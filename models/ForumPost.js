
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const forumPostSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 10
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comments: [commentSchema],
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['General', 'Help', 'Tutorials', 'Suggestions', 'Bug Reports', 'Announcements'],
    default: 'General'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Virtual for post URL
forumPostSchema.virtual('url').get(function() {
  return `/forum/post/${this._id}`;
});

// Create text index for search capability
forumPostSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('ForumPost', forumPostSchema);
