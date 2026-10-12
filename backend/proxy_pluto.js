const express = require('express');
const cors = require('cors');
const request = require('request');
const app = express();

app.use(cors()); // enable global CORS

app.get('/proxy', (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Missing URL');
  }

  // Log request
  logger.info('[Proxy Fetch]', targetUrl);

  // Pipe request while modifying headers
  request({
    url: targetUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'referer': 'https://pluto.tv',
      'origin': 'https://pluto.tv'
    }
  })
    .on('response', function (response) {
      // Strip Pluto’s CORS header and replace with wildcard
      delete response.headers['access-control-allow-origin'];
      response.headers['access-control-allow-origin'] = '*';
    })
    .on('error', function (err) {
      logger.error('❌ Proxy error:', err.message);
      res.status(500).send('Proxy Error');
    })
    .pipe(res);
});

app.listen(5000, () => {
  logger.info('✅ Proxy server running on http://localhost:5000');
});
