const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const { v4: uuidv4 } = require('uuid');

const bots = {}; // Store bot instances in memory

async function createBot(options) {
  return new Promise((resolve, reject) => {
    const serverId = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    const serverKey = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    
    const botOptions = {
      host: options.ip,
      port: options.port || 25565,
      username: options.botName || `LostCloudBot_${serverId}` // <-- Use custom bot name
    };

    const bot = mineflayer.createBot(botOptions);
    bot.loadPlugin(pathfinder);

    bot.once('spawn', () => {
      bots[serverId] = bot;
      resolve({ serverId, serverKey });
    });

    bot.on('error', (err) => {
      console.error('Bot error:', err.message);
      reject(err);
    });
  });
}

function deleteBot(serverId, serverKey, storedKey) {
  return new Promise((resolve, reject) => {
    if (serverKey !== storedKey) return reject(new Error('Invalid server key'));
    const bot = bots[serverId];
    if (!bot) return reject(new Error('Bot not found'));
    try {
      bot.end();
      delete bots[serverId];
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { createBot, deleteBot, bots };
