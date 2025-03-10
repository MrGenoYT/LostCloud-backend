const express = require('express');
const { body, validationResult } = require('express-validator');
const { createBot, deleteBot } = require('../botManager');
const Bot = require('../models/Bot');
const verifyCaptcha = require('../middleware/captcha');
const isAuthenticated = require('../middleware/authMiddleware');
const router = express.Router();

// Create a new bot (max 3 per user) with CAPTCHA
router.post('/create', isAuthenticated, verifyCaptcha, [
  body('type').isIn(['java', 'bedrock', 'java+bedrock']),
  body('ip').notEmpty().withMessage('Server IP required'),
  body('port').optional().isNumeric().withMessage('Port must be a number')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const count = await Bot.countDocuments({ user: req.user._id });
    if (count >= 3) return res.status(400).json({ error: 'Maximum of 3 bots allowed. Delete one to create a new one.' });
    
    const { type, ip, port } = req.body;
    const { serverId, serverKey } = await createBot({ ip, port });
    const newBot = await Bot.create({
      user: req.user._id,
      serverId,
      serverKey,
      type,
      ip,
      port: port || undefined
    });
    res.json({ message: 'Bot created', bot: { serverId, serverKey } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a bot using Server ID and Server Key
router.post('/delete', isAuthenticated, [
  body('serverId').notEmpty(),
  body('serverKey').notEmpty()
], async (req, res) => {
  const { serverId, serverKey } = req.body;
  try {
    const botRecord = await Bot.findOne({ serverId, user: req.user._id });
    if (!botRecord) return res.status(404).json({ error: 'Bot not found' });
    if (botRecord.serverKey !== serverKey) return res.status(403).json({ error: 'Invalid server key' });
    
    await deleteBot(serverId, serverKey, botRecord.serverKey);
    await Bot.deleteOne({ serverId });
    res.json({ message: 'Bot removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
