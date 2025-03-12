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
const mongoose = require('mongoose');

const BotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  serverIP: {
    type: String,
    required: true,
    trim: true
  },
  serverPort: {
    type: Number,
    required: true,
    default: 25565
  },
  version: {
    type: String,
    required: true,
    default: '1.16.5'
  },
  status: {
    type: String,
    enum: ['offline', 'online', 'error'],
    default: 'offline'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  configuration: {
    autoReconnect: {
      type: Boolean,
      default: true
    },
    reconnectDelay: {
      type: Number,
      default: 5000
    },
    preventAfk: {
      type: Boolean,
      default: true
    },
    autoRespond: {
      type: Boolean,
      default: false
    },
    responses: [
      {
        trigger: String,
        response: String
      }
    ]
  },
  lastConnected: {
    type: Date
  },
  lastDisconnected: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bot', BotSchema);
