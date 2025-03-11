const mineflayer = require('mineflayer');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const { v4: uuidv4 } = require('uuid');

const bots = {}; // In-memory storage for bot instances

/**
 * Creates and spawns a new bot with the provided options.
 * @param {Object} options - Options for creating the bot.
 * @returns {Promise<Object>} - Resolves with { serverId, serverKey }.
 */
async function createBot(options) {
  return new Promise((resolve, reject) => {
    const serverId = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    const serverKey = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();

    function spawnBot() {
      if (bots[serverId]) {
        console.log(`Bot ${serverId} is already running. Skipping spawn.`);
        return;
      }

      const bot = mineflayer.createBot({
        host: options.ip,
        port: options.port || 25565,
        username: options.botName || `LostCloudBot_${serverId}`
      });

      bot.loadPlugin(pathfinder); // Ensure pathfinder is loaded

      bot.once('spawn', () => {
        setupBotActions(bot);
        bots[serverId] = bot;
        console.log(`Bot ${serverId} spawned on ${options.ip}`);
        resolve({ serverId, serverKey });
      });

      // Auto-reconnect on disconnect
      bot.on('end', () => {
        console.log(`Bot ${serverId} disconnected. Reconnecting in 10 seconds...`);
        delete bots[serverId];
        setTimeout(() => spawnBot(), 10000);
      });

      bot.on('kicked', (reason) => {
        console.log(`Bot ${serverId} was kicked: ${reason}. Reconnecting in 10 seconds...`);
        delete bots[serverId];
        setTimeout(() => spawnBot(), 10000);
      });

      bot.on('error', (err) => {
        console.error(`Error on bot ${serverId}:`, err.message);
      });
    }

    spawnBot();
  });
}

/**
 * Deletes a bot instance after validating the server key.
 * @param {string} serverId - The unique server ID.
 * @param {string} serverKey - The user-provided server key.
 * @param {string} storedKey - The stored server key for validation.
 * @returns {Promise}
 */
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

/**
 * Sets up periodic actions for the bot to simulate human-like behavior.
 * @param {Object} bot - The bot instance.
 */
function setupBotActions(bot) {
  function rotateHead() {
    if (!bot.entity) return;
    const duration = 1000;
    const steps = 20;
    const intervalTime = duration / steps;
    let step = 0;
    const initialYaw = bot.entity.yaw;
    const targetYaw = initialYaw + 2 * Math.PI;

    const interval = setInterval(() => {
      if (step >= steps) {
        clearInterval(interval);
      } else {
        bot.look(initialYaw + ((targetYaw - initialYaw) * (step / steps)), bot.entity.pitch, false);
        step++;
      }
    }, intervalTime);
  }

  function moveRandomly() {
    if (!bot.entity) return;
    try {
      const x = Math.floor(Math.random() * 10 - 5);
      const z = Math.floor(Math.random() * 10 - 5);
      const goal = new goals.GoalBlock(
        Math.floor(bot.entity.position.x + x),
        Math.floor(bot.entity.position.y),
        Math.floor(bot.entity.position.z + z)
      );
      bot.pathfinder.setGoal(goal);

      if (Math.random() > 0.7) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
      }
    } catch (err) {
      console.error('Error in moveRandomly:', err.message);
    }
  }

  function preventAfk() {
    try {
      bot.swingArm();
      bot.setControlState('sneak', true);
      setTimeout(() => bot.setControlState('sneak', false), Math.random() * 1000 + 500);
    } catch (err) {
      console.error('Error in preventAfk:', err.message);
    }
  }

  setInterval(rotateHead, 300000);
  setInterval(moveRandomly, 5000);
  setInterval(preventAfk, 60000);
}

module.exports = { createBot, deleteBot, bots };
