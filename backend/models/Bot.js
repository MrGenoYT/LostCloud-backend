const mongoose = require('mongoose');

const BotSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  serverId: { type: String, unique: true },
  serverKey: { type: String },  // Shown only once to the user
  type: { type: String, enum: ['java', 'bedrock', 'java+bedrock'] },
  ip: { type: String, required: true },
  port: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bot', BotSchema);
