const express = require('express');
const fs = require('fs');
const router = express.Router();

router.get('/admin/channels', (req, res) => {
  try {
    const allChannels = JSON.parse(fs.readFileSync('./data/final_clean_channels.json', 'utf-8'));
    res.json({ status: 'success', data: allChannels });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Could not load channels', error: err.message });
  }
});

module.exports = router;
