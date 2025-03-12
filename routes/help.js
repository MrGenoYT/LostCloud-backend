
const express = require('express');
const router = express.Router();

// Get help resources
router.get('/', (req, res) => {
  const helpResources = {
    faq: [
      {
        question: "What is LostCloud?",
        answer: "LostCloud is a platform that allows you to create and manage Minecraft bots that can perform various tasks on your server. The bots can be customized and monitored through our user-friendly dashboard."
      },
      {
        question: "How do I create a bot?",
        answer: "After registering and logging in, navigate to the Dashboard and click on 'Create Bot'. Fill in the server details, customize your bot's settings, and click 'Create'."
      },
      {
        question: "Is it free to use?",
        answer: "Yes, LostCloud is currently free to use with basic features. We plan to introduce premium plans with advanced features in the future."
      },
      {
        question: "How many bots can I create?",
        answer: "Free accounts can create up to 2 bots. This limit may change in the future as we expand our services."
      },
      {
        question: "Do the bots stay connected when I close my browser?",
        answer: "Yes, the bots run on our servers and will remain connected to your Minecraft server even when you're offline, as long as both servers remain operational."
      }
    ],
    tutorials: [
      {
        title: "Getting Started with LostCloud",
        url: "/forum/category/Tutorials",
        description: "A comprehensive guide for beginners to set up their first bot."
      },
      {
        title: "Advanced Bot Configuration",
        url: "/forum/category/Tutorials",
        description: "Learn about the advanced settings and how to optimize your bot's performance."
      },
      {
        title: "Troubleshooting Common Issues",
        url: "/forum/category/Help",
        description: "Solutions to common problems users encounter when setting up bots."
      }
    ],
    contact: {
      email: "support@lostcloud.example.com",
      discord: "https://discord.gg/lostcloud",
      forum: "/forum/category/Help"
    },
    youtube: {
      channel: "https://youtube.com/@itz_geno?si=JzLxCVMZOOofWGsg",
      description: "Check out our YouTube channel for video tutorials and updates!"
    },
    botCommands: [
      {
        command: "/help",
        description: "Shows available commands"
      },
      {
        command: "/status",
        description: "Checks the bot's current status"
      },
      {
        command: "/tp <location>",
        description: "Teleports the bot to a specific location"
      },
      {
        command: "/follow <player>",
        description: "Makes the bot follow a specific player"
      },
      {
        command: "/stop",
        description: "Stops the current action"
      }
    ]
  };

  res.json(helpResources);
});

// Get specific help category
router.get('/:category', (req, res) => {
  const { category } = req.params;
  
  const helpData = {
    faq: [
      {
        question: "What is LostCloud?",
        answer: "LostCloud is a platform that allows you to create and manage Minecraft bots that can perform various tasks on your server. The bots can be customized and monitored through our user-friendly dashboard."
      },
      {
        question: "How do I create a bot?",
        answer: "After registering and logging in, navigate to the Dashboard and click on 'Create Bot'. Fill in the server details, customize your bot's settings, and click 'Create'."
      },
      {
        question: "Is it free to use?",
        answer: "Yes, LostCloud is currently free to use with basic features. We plan to introduce premium plans with advanced features in the future."
      },
      {
        question: "How many bots can I create?",
        answer: "Free accounts can create up to 2 bots. This limit may change in the future as we expand our services."
      },
      {
        question: "Do the bots stay connected when I close my browser?",
        answer: "Yes, the bots run on our servers and will remain connected to your Minecraft server even when you're offline, as long as both servers remain operational."
      }
    ],
    tutorials: [
      {
        title: "Getting Started with LostCloud",
        url: "/forum/category/Tutorials",
        description: "A comprehensive guide for beginners to set up their first bot."
      },
      {
        title: "Advanced Bot Configuration",
        url: "/forum/category/Tutorials",
        description: "Learn about the advanced settings and how to optimize your bot's performance."
      },
      {
        title: "Troubleshooting Common Issues",
        url: "/forum/category/Help",
        description: "Solutions to common problems users encounter when setting up bots."
      }
    ],
    commands: [
      {
        command: "/help",
        description: "Shows available commands"
      },
      {
        command: "/status",
        description: "Checks the bot's current status"
      },
      {
        command: "/tp <location>",
        description: "Teleports the bot to a specific location"
      },
      {
        command: "/follow <player>",
        description: "Makes the bot follow a specific player"
      },
      {
        command: "/stop",
        description: "Stops the current action"
      }
    ],
    contact: {
      email: "support@lostcloud.example.com",
      discord: "https://discord.gg/lostcloud",
      forum: "/forum/category/Help",
      youtube: "https://youtube.com/@itz_geno?si=JzLxCVMZOOofWGsg"
    }
  };
  
  if (helpData[category]) {
    return res.json(helpData[category]);
  } else {
    return res.status(404).json({ message: 'Help category not found' });
  }
});

module.exports = router;
