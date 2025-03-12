const express = require('express');
const router = express.Router();
const Bot = require('../models/Bot');
const auth = require('../middleware/auth');
const botManager = require('../botManager');

// Get all bots for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const bots = await Bot.find({ owner: req.user.id });
    res.json(bots);
  } catch (err) {
    console.error('Error fetching bots:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific bot
router.get('/:id', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, owner: req.user.id });

    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }

    res.json(bot);
  } catch (err) {
    console.error('Error fetching bot:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new bot
router.post('/', auth, async (req, res) => {
  try {
    const { name, username, serverIP, serverPort, version } = req.body;

    // Check if the user already has the max number of bots
    const botsCount = await Bot.countDocuments({ owner: req.user.id });
    const maxBots = req.user.role === 'admin' ? 10 : 2; // Adjust limits as needed

    if (botsCount >= maxBots) {
      return res.status(400).json({ 
        message: `You have reached the maximum limit of ${maxBots} bots. Upgrade your account to create more.` 
      });
    }

    // Create new bot
    const newBot = new Bot({
      name,
      username,
      serverIP,
      serverPort,
      version,
      owner: req.user.id
    });

    await newBot.save();

    res.status(201).json(newBot);
  } catch (err) {
    console.error('Error creating bot:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a bot
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, username, serverIP, serverPort, version } = req.body;

    // Find bot and check ownership
    let bot = await Bot.findOne({ _id: req.params.id, owner: req.user.id });

    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }

    // Stop bot if it's running
    if (bot.status === 'online') {
      await botManager.stopBot(bot._id);
    }

    // Update bot
    bot.name = name || bot.name;
    bot.username = username || bot.username;
    bot.serverIP = serverIP || bot.serverIP;
    bot.serverPort = serverPort || bot.serverPort;
    bot.version = version || bot.version;

    await bot.save();

    res.json(bot);
  } catch (err) {
    console.error('Error updating bot:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a bot
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find bot and check ownership
    const bot = await Bot.findOne({ _id: req.params.id, owner: req.user.id });

    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }

    // Stop bot if it's running
    if (bot.status === 'online') {
      await botManager.stopBot(bot._id);
    }

    // Delete bot
    await Bot.findByIdAndDelete(req.params.id);

    res.json({ message: 'Bot deleted successfully' });
  } catch (err) {
    console.error('Error deleting bot:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start a bot
router.post('/:id/start', auth, async (req, res) => {
  try {
    // Find bot and check ownership
    const bot = await Bot.findOne({ _id: req.params.id, owner: req.user.id });

    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }

    // Start bot
    const result = await botManager.startBot(bot._id);

    res.json({ message: result.message });
  } catch (err) {
    console.error('Error starting bot:', err);
    res.status(500).json({ message: 'Failed to start bot' });
  }
});

// Stop a bot
router.post('/:id/stop', auth, async (req, res) => {
  try {
    // Find bot and check ownership
    const bot = await Bot.findOne({ _id: req.params.id, owner: req.user.id });

    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }

    // Stop bot
    const result = await botManager.stopBot(bot._id);

    res.json({ message: result.message });
  } catch (err) {
    console.error('Error stopping bot:', err);
    res.status(500).json({ message: 'Failed to stop bot' });
  }
});

// Send command to bot
router.post('/:id/command', auth, async (req, res) => {
  try {
    const { command } = req.body;

    // Find bot and check ownership
    const bot = await Bot.findOne({ _id: req.params.id, owner: req.user.id });

    if (!bot) {
      return res.status(404).json({ message: 'Bot not found' });
    }

    if (bot.status !== 'online') {
      return res.status(400).json({ message: 'Bot is not online' });
    }

    // Send command to bot
    const result = await botManager.sendCommand(bot._id, command);

    res.json({ message: `Command sent: ${command}`, result });
  } catch (err) {
    console.error('Error sending command:', err);
    res.status(500).json({ message: 'Failed to send command' });
  }
});

// Export the router
module.exports = router;