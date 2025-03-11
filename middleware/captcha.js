const axios = require('axios');

async function verifyCaptcha(req, res, next) {
  const token = req.body.captchaToken;
  if (!token) return res.status(400).json({ error: 'Captcha token missing' });
  try {
    const secret = process.env.RECAPTCHA_SECRET;
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
    );
    if (response.data.success) {
      next();
    } else {
      res.status(400).json({ error: 'Captcha verification failed' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Captcha verification error' });
  }
}

module.exports = verifyCaptcha;
