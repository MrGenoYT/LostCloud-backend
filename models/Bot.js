const mongoose = require('mongoose');

const BotSchema = new mongoose.Schema({
  serverId: {
    type: String,
    required: true,
    unique: true
  },
  serverKey: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  serverIP: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: Number,
    default: 25565
  },
  serverType: {
    type: String,
    enum: ['Java', 'Bedrock', 'Java+Bedrock'],
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'connecting', 'error'],
    default: 'offline'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  settings: {
    autoReconnect: {
      type: Boolean,
      default: true
    },
    antiAfk: {
      type: Boolean,
      default: true
    },
    logging: {
      type: Boolean,
      default: true
    },
    pathfinding: {
      type: Boolean,
      default: true
    }
  }
});

module.exports = mongoose.model('Bot', BotSchema);