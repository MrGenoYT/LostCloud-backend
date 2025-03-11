const express = require('express');
const { body, validationResult } = require('express-validator');
const { createBot, deleteBot } = require('../botManager');
const Bot = require('../models/Bot');
const verifyCaptcha = require('../middleware/captcha');
const isAuthenticated = require('../middleware/authMiddleware');
const router = express.Router();

// Create a new bot with a custom name
router.post('/create', isAuthenticated, verifyCaptcha, [
  body('botName').trim().notEmpty().withMessage('Bot name is required'), // <-- NEW VALIDATION
  body('type').isIn(['java', 'bedrock', 'java+bedrock']),
  body('ip').notEmpty().withMessage('Server IP required'),
  body('port').optional().isNumeric().withMessage('Port must be a number')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const count = await Bot.countDocuments({ user: req.user._id });
    if (count >= 3) return res.status(400).json({ error: 'Maximum of 3 bots allowed. Delete one to create a new one.' });

    const { botName, type, ip, port } = req.body;
    const { serverId, serverKey } = await createBot({ botName, ip, port });
    
    const newBot = await Bot.create({
      user: req.user._id,
      botName, // <-- Store the custom bot name
      serverId,
      serverKey,
      type,
      ip,
      port: port || undefined
    });

    res.json({ message: 'Bot created', bot: { serverId, serverKey, botName } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
