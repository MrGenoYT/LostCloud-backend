
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
        title: "Bot Commands and Actions",
        url: "/forum/category/Commands",
        description: "Learn about the various commands you can use to control your bots."
      },
      {
        title: "Advanced Bot Configuration",
        url: "/forum/category/Advanced",
        description: "Explore advanced features and settings for power users."
      }
    ],
    contact: {
      email: "support@lostcloud.io",
      discord: "https://discord.gg/lostcloud",
      twitter: "@LostCloudApp"
    }
  };
  
  res.json(helpResources);
});

// Export the router
module.exports = router;
