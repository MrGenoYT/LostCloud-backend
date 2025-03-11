
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    title: "LostCloud Bot Setup Help",
    content: "To set up your bot, follow these steps:\n\n1. Create a server on a hosting platform (for example, Aternos).\n2. If needed, enable cracked mode.\n3. Start your server.\n4. In LostCloud, log in and go to the Dashboard.\n5. Click on 'Deploy Bot' and choose your server type (Java, Bedrock, or Java+Bedrock).\n6. Enter your server IP (and port if required) and complete the CAPTCHA.\n7. Save your unique Server ID and Server Key (the key is shown only once and is required for deletion).\n\nFor additional troubleshooting, visit the Forum."
  });
});

module.exports = router;
