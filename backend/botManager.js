const mineflayer = require('mineflayer');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const { v4: uuidv4 } = require('uuid');

const bots = {}; // In-memory storage for bot instances

/**
 * Creates and spawns a new bot with the provided options.
 * The bot will automatically attempt to reconnect after disconnects.
 * @param {Object} options - Options for creating the bot.
 * @param {string} options.ip - The server IP.
 * @param {number} [options.port] - The server port.
 * @param {string} [options.botName] - The custom bot name chosen by the user.
 * @returns {Promise<Object>} - Resolves with an object containing { serverId, serverKey }.
 */
async function createBot(options) {
  return new Promise((resolve, reject) => {
    const serverId = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    const serverKey = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();

    // Function that spawns the bot
    function spawnBot() {
      const bot = mineflayer.createBot({
        host: options.ip,
        port: options.port || 25565,
        username: options.botName || `LostCloudBot_${serverId}`
      });

      // Load pathfinder plugin for navigation
      bot.loadPlugin(pathfinder);

      // When the bot spawns, set up its periodic actions and store it
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

      // Auto-reconnect if the bot is kicked
      bot.on('kicked', (reason) => {
        console.log(`Bot ${serverId} was kicked: ${reason}. Reconnecting in 10 seconds...`);
        delete bots[serverId];
        setTimeout(() => spawnBot(), 10000);
      });

      // Log any errors encountered by the bot
      bot.on('error', (err) => {
        console.error(`Error on bot ${serverId}:`, err.message);
      });
    }

    spawnBot();
  });
}

/**
 * Deletes a bot instance after validating the server key.
 * It calls bot.end(), removes the instance from the in-memory store, and resolves.
 * @param {string} serverId - The unique server ID for the bot.
 * @param {string} serverKey - The server key provided by the user.
 * @param {string} storedKey - The server key stored in the database.
 * @returns {Promise} - Resolves if deletion is successful.
 */
function deleteBot(serverId, serverKey, storedKey) {
  return new Promise((resolve, reject) => {
    if (serverKey !== storedKey) {
      return reject(new Error('Invalid server key'));
    }
    const bot = bots[serverId];
    if (!bot) {
      return reject(new Error('Bot not found'));
    }
    try {
      bot.end(); // End the bot's connection
      // (Optional: You could add any random behavior here if needed)
      delete bots[serverId];
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Sets up periodic actions for the bot to simulate human-like behavior.
 * Includes head rotation, random movement (with occasional jumps), and AFK prevention (sneaking).
 * @param {Object} bot - The bot instance.
 */
function setupBotActions(bot) {
  // Rotate the bot's head 360° smoothly over 1 second
  function rotateHead() {
    if (!bot.entity) return;
    const duration = 1000; // milliseconds
    const steps = 20;
    const intervalTime = duration / steps;
    let step = 0;
    const initialYaw = bot.entity.yaw;
    const targetYaw = initialYaw + 2 * Math.PI; // full rotation

    const interval = setInterval(() => {
      if (step >= steps) {
        clearInterval(interval);
      } else {
        const newYaw = initialYaw + ((targetYaw - initialYaw) * (step / steps));
        bot.look(newYaw, bot.entity.pitch, false);
        step++;
      }
    }, intervalTime);
  }

  // Move the bot to a random nearby location and occasionally jump
  function moveRandomly() {
    if (!bot.entity) return;
    try {
      const x = Math.floor(Math.random() * 10 - 5);
      const z = Math.floor(Math.random() * 10 - 5);
      const goal = new goals.GoalBlock(
        bot.entity.position.x + x,
        bot.entity.position.y,
        bot.entity.position.z + z
      );
      bot.pathfinder.setGoal(goal);
      // Occasionally trigger a jump action
      if (Math.random() > 0.7) {
        bot.setControlState('jump', true);
        setTimeout(() => {
          bot.setControlState('jump', false);
        }, 500);
      }
    } catch (err) {
      console.error('Error in moveRandomly:', err.message);
    }
  }

  // Prevent AFK: Swing arm and toggle sneaking
  function preventAfk() {
    try {
      bot.swingArm();
      bot.setControlState('sneak', true);
      setTimeout(() => {
        bot.setControlState('sneak', false);
      }, Math.random() * 1000 + 500);
    } catch (err) {
      console.error('Error in preventAfk:', err.message);
    }
  }

  // Schedule periodic actions
  setInterval(rotateHead, 300000);  // Every 5 minutes
  setInterval(moveRandomly, 5000);    // Every 5 seconds
  setInterval(preventAfk, 60000);     // Every 60 seconds
}

module.exports = { createBot, deleteBot, bots };
