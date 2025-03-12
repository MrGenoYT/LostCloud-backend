
const Bot = require('./models/Bot');
const { EventEmitter } = require('events');

class BotManager {
  constructor() {
    this.bots = new Map();
    this.io = null;
    this.events = new EventEmitter();
  }

  init(io) {
    this.io = io;
    
    // Setup event listeners
    this.events.on('bot-connect', (botId) => {
      this.notifyStatusChange(botId, true);
    });
    
    this.events.on('bot-disconnect', (botId) => {
      this.notifyStatusChange(botId, false);
    });
    
    this.events.on('bot-message', (botId, message) => {
      this.sendLog(botId, 'info', message);
    });
    
    this.events.on('bot-error', (botId, error) => {
      this.sendLog(botId, 'error', error);
    });

    // Check for any bots that should be running
    this.loadActiveBots();

    console.log('Bot Manager initialized');
  }

  async loadActiveBots() {
    try {
      const activeBots = await Bot.find({ autoStart: true });
      console.log(`Loading ${activeBots.length} active bots...`);
      
      activeBots.forEach(bot => {
        this.startBot(bot._id.toString());
      });
    } catch (error) {
      console.error('Error loading active bots:', error);
    }
  }

  async startBot(botId) {
    try {
      // If bot is already running, do nothing
      if (this.bots.has(botId)) {
        return { success: true, message: 'Bot is already running' };
      }

      // Find bot in database
      const bot = await Bot.findById(botId);
      if (!bot) {
        return { success: false, message: 'Bot not found' };
      }

      // Create bot instance (simulation for this example)
      const botInstance = {
        id: botId,
        name: bot.name,
        serverAddress: bot.serverAddress,
        serverPort: bot.serverPort || 25565,
        status: 'connecting',
        lastActivity: Date.now(),
        connected: false,
        disconnect: () => {
          botInstance.connected = false;
          botInstance.status = 'disconnected';
          this.events.emit('bot-disconnect', botId);
          return true;
        },
        handleDisconnect: () => {
          // If bot disconnects unexpectedly
          if (botInstance.connected) {
            botInstance.connected = false;
            botInstance.status = 'disconnected';
            this.events.emit('bot-disconnect', botId);
            this.sendLog(botId, 'error', 'Bot disconnected unexpectedly');
            
            // Try to reconnect in 10 seconds
            this.stopBot(botId, false);
          }
        }
      };

      // Store bot instance
      this.bots.set(botId, botInstance);
      
      // Simulate connection process
      this.sendLog(botId, 'info', `Connecting to ${botInstance.serverAddress}:${botInstance.serverPort}...`);
      
      setTimeout(() => {
        // Simulate successful connection
        botInstance.connected = true;
        botInstance.status = 'connected';
        this.events.emit('bot-connect', botId);
        this.sendLog(botId, 'success', 'Connected successfully');
        
        // Start simulating activity
        this.simulateBotActivity(botId);
      }, 2000);
      
      return { success: true, message: 'Bot started successfully' };
    } catch (error) {
      console.error(`Error starting bot ${botId}:`, error);
      return { success: false, message: `Error starting bot: ${error.message}` };
    }
  }

  async stopBot(botId, permanentStop = true) {
    try {
      const botInstance = this.bots.get(botId);
      if (!botInstance) {
        return { success: false, message: 'Bot is not running' };
      }
      
      this.sendLog(botId, 'info', 'Stopping bot...');
      
      // Disconnect bot
      botInstance.disconnect();
      
      if (permanentStop) {
        // Remove bot instance
        this.bots.delete(botId);
      } else {
        // Bot will try to reconnect later
        botInstance.status = 'reconnecting';
        this.sendLog(botId, 'info', 'Will attempt to reconnect in 10 seconds...');
        
        // Schedule reconnection attempt after 10 seconds
        setTimeout(() => {
          this.reconnectBot(botId);
        }, 10000);
      }
      
      return { success: true, message: permanentStop ? 'Bot stopped successfully' : 'Bot disconnected, will try to reconnect' };
    } catch (error) {
      console.error(`Error stopping bot ${botId}:`, error);
      return { success: false, message: `Error stopping bot: ${error.message}` };
    }
  }
  
  async reconnectBot(botId) {
    const botInstance = this.bots.get(botId);
    if (!botInstance || botInstance.connected) return;
    
    this.sendLog(botId, 'info', `Attempting to reconnect to ${botInstance.serverAddress}:${botInstance.serverPort}...`);
    
    // Simulate connection process
    setTimeout(() => {
      // 80% chance of successful reconnection in this simulation
      if (Math.random() < 0.8) {
        botInstance.connected = true;
        botInstance.status = 'connected';
        this.events.emit('bot-connect', botId);
        this.sendLog(botId, 'success', 'Reconnected successfully');
        
        // Start simulating activity
        this.simulateBotActivity(botId);
      } else {
        this.sendLog(botId, 'error', 'Reconnection failed, trying again in 10 seconds...');
        
        // Schedule another reconnection attempt
        setTimeout(() => {
          this.reconnectBot(botId);
        }, 10000);
      }
    }, 2000);
  }

  notifyStatusChange(botId, isOnline) {
    if (this.io) {
      this.io.to(`bot:${botId}`).emit('bot-status', { online: isOnline });
    }
  }

  sendLog(botId, type, message) {
    if (this.io) {
      this.io.to(`bot:${botId}`).emit('bot-log', { type, message });
    }
  }

  simulateBotActivity(botId) {
    const botInstance = this.bots.get(botId);
    if (!botInstance || !botInstance.connected) return;
    
    // Simulate random bot activity
    const activities = [
      'Moving forward...',
      'Looking around...',
      'Jumping to avoid AFK detection...',
      'Sneaking briefly...',
      'Rotating head...'
    ];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    
    this.sendLog(botId, 'info', randomActivity);
    botInstance.lastActivity = Date.now();
    
    // Randomly simulate disconnection (5% chance)
    if (Math.random() < 0.05) {
      botInstance.handleDisconnect();
      return;
    }
    
    // Schedule next activity simulation exactly every 5 seconds
    setTimeout(() => {
      this.simulateBotActivity(botId);
    }, 5000); // Exactly 5 seconds interval
  }

  sendCommand(botId, command, params, callback) {
    try {
      const botInstance = this.bots.get(botId);
      if (!botInstance) {
        return callback({ success: false, message: 'Bot is not running' });
      }
      
      if (!botInstance.connected) {
        return callback({ success: false, message: 'Bot is not connected' });
      }
      
      this.sendLog(botId, 'info', `Executing command: ${command}`);
      
      // Simulate command execution
      setTimeout(() => {
        // Handle different commands
        switch (command.toLowerCase()) {
          case 'say':
            if (!params || !params.message) {
              return callback({ success: false, message: 'Message parameter is required' });
            }
            return callback({ success: true, message: `Said: ${params.message}` });
            
          case 'move':
            if (!params || !params.direction) {
              return callback({ success: false, message: 'Direction parameter is required' });
            }
            return callback({ success: true, message: `Moving ${params.direction}` });
            
          case 'jump':
            return callback({ success: true, message: 'Jumped!' });
            
          case 'status':
            return callback({ 
              success: true, 
              message: `Status: ${botInstance.status}, Connected: ${botInstance.connected}, Last activity: ${new Date(botInstance.lastActivity).toLocaleTimeString()}` 
            });
            
          default:
            return callback({ success: false, message: `Unknown command: ${command}` });
        }
      }, 500);
    } catch (error) {
      console.error(`Error executing command for bot ${botId}:`, error);
      return callback({ success: false, message: `Error executing command: ${error.message}` });
    }
  }

  getBotStatus(botId) {
    const botInstance = this.bots.get(botId);
    if (!botInstance) {
      return { running: false, connected: false };
    }
    
    return {
      running: true,
      connected: botInstance.connected,
      status: botInstance.status,
      lastActivity: botInstance.lastActivity
    };
  }
}

// Export singleton instance
module.exports = new BotManager();
