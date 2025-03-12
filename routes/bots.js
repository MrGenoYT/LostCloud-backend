
const express = require('express');
const router = express.Router();
const { createBot, deleteBot, bots } = require('../botManager');
const User = require('../models/User');
const Bot = require('../models/Bot');
const axios = require('axios');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized: Please login' });
};

// Verify CAPTCHA
async function verifyCaptcha(token) {
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    );
    return response.data.success;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
}

// Get all bots for the authenticated user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userBots = await Bot.find({ owner: req.user._id });
    
    // Add real-time status from in-memory bot instances
    const botsWithStatus = userBots.map(bot => {
      const botInstance = bots[bot.serverId];
      
      return {
        _id: bot._id,
        serverId: bot.serverId,
        name: bot.name,
        serverIP: bot.serverIP,
        serverType: bot.serverType,
        status: botInstance ? 'online' : (bot.status || 'offline'),
        createdAt: bot.createdAt
      };
    });
    
    res.json(botsWithStatus);
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new bot
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { name, serverIP, serverType, captchaToken } = req.body;
    
    // Validate required fields
    if (!name || !serverIP || !serverType) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Verify CAPTCHA
    if (!captchaToken) {
      return res.status(400).json({ message: 'CAPTCHA verification required' });
    }
    
    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid) {
      return res.status(400).json({ message: 'CAPTCHA verification failed' });
    }
    
    // Check if user has reached bot limit (2)
    const user = await User.findById(req.user._id);
    if (user.botCount >= 2) {
      return res.status(400).json({ 
        message: 'Bot limit reached (2 bots maximum). Please delete an existing bot before creating a new one.' 
      });
    }
    
    // Create bot in Minecraft
    const botOptions = {
      username: name,
      host: serverIP.split(':')[0],
      port: serverIP.split(':')[1] || 25565,
      version: serverType
    };
    
    const result = await createBot(botOptions);
    
    // Save bot to database
    const newBot = new Bot({
      serverId: result.serverId,
      serverKey: result.serverKey,
      name,
      serverIP,
      serverType,
      owner: req.user._id,
      status: 'connecting'
    });
    
    await newBot.save();
    
    // Increment user's bot count
    await User.findByIdAndUpdate(req.user._id, { $inc: { botCount: 1 } });
    
    res.status(201).json({
      message: 'Bot created successfully',
      serverId: result.serverId,
      serverKey: result.serverKey,
      name,
      serverIP,
      serverType
    });
  } catch (error) {
    console.error('Error creating bot:', error);
    res.status(500).json({ message: 'Failed to create bot: ' + error.message });
  }
});

// Delete a bot
router.delete('/:serverId', isAuthenticated, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { serverKey } = req.body;
    
    if (!serverId || !serverKey) {
      return res.status(400).json({ message: 'Server ID and Server Key are required' });
    }
    
    // Verify bot ownership
    const bot = await Bot.findOne({ serverId, owner: req.user._id });
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found or you do not have permission' });
    }
    
    // Verify server key
    if (bot.serverKey !== serverKey) {
      return res.status(403).json({ message: 'Invalid Server Key' });
    }
    
    // Delete bot from Minecraft
    await deleteBot(serverId, serverKey);
    
    // Delete bot from database
    await Bot.findOneAndDelete({ serverId });
    
    // Decrement user's bot count
    await User.findByIdAndUpdate(req.user._id, { $inc: { botCount: -1 } });
    
    res.json({ message: 'Bot deleted successfully' });
  } catch (error) {
    console.error('Error deleting bot:', error);
    res.status(500).json({ message: 'Failed to delete bot: ' + error.message });
  }
});

// Update a bot
router.put('/:serverId', isAuthenticated, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, serverIP, serverType, serverKey } = req.body;
    
    if (!serverId || !serverKey) {
      return res.status(400).json({ message: 'Server ID and Server Key are required' });
    }
    
    // Verify bot ownership
    const bot = await Bot.findOne({ serverId, owner: req.user._id });
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found or you do not have permission' });
    }
    
    // Verify server key
    if (bot.serverKey !== serverKey) {
      return res.status(403).json({ message: 'Invalid Server Key' });
    }
    
    // To update the bot, we need to delete the current one and create a new one
    await deleteBot(serverId, serverKey);
    
    // Create a new bot with updated settings
    const botOptions = {
      username: name || bot.name,
      host: serverIP ? serverIP.split(':')[0] : bot.serverIP.split(':')[0],
      port: serverIP ? (serverIP.split(':')[1] || 25565) : (bot.serverIP.split(':')[1] || 25565),
      version: serverType || bot.serverType
    };
    
    const result = await createBot(botOptions);
    
    // Update bot in database
    bot.name = name || bot.name;
    bot.serverIP = serverIP || bot.serverIP;
    bot.serverType = serverType || bot.serverType;
    bot.serverId = result.serverId;
    bot.serverKey = result.serverKey;
    bot.status = 'connecting';
    
    await bot.save();
    
    res.json({
      message: 'Bot updated successfully',
      serverId: result.serverId,
      serverKey: result.serverKey,
      name: bot.name,
      serverIP: bot.serverIP,
      serverType: bot.serverType
    });
  } catch (error) {
    console.error('Error updating bot:', error);
    res.status(500).json({ message: 'Failed to update bot: ' + error.message });
  }
});

// Get bot status
router.get('/:serverId/status', isAuthenticated, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Verify bot ownership
    const bot = await Bot.findOne({ serverId, owner: req.user._id });
    if (!bot) {
      return res.status(404).json({ message: 'Bot not found or you do not have permission' });
    }
    
    const botInstance = bots[serverId];
    const status = botInstance ? 'online' : 'offline';
    
    res.json({ status });
  } catch (error) {
    console.error('Error getting bot status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
