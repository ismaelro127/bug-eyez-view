logger.info("🚀 Running THIS proxy file:", __filename);


const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(cors());

const agent = new https.Agent({
  rejectUnauthorized: false,
});

// ============================
// NORMAL PROXY
// ============================
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing URL');

  logger.info('🔄 Proxy ->', targetUrl);

  try {
    const response = await axios({
      method: 'GET',
      url: targetUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://example.com',
        'Referer': 'https://example.com'
      },
      httpsAgent: agent,
      maxRedirects: 10
    });

    Object.keys(response.headers).forEach(h => {
      res.setHeader(h, response.headers[h]);
    });

    res.setHeader('Access-Control-Allow-Origin', '*');

    response.data.pipe(res);

  } catch (err) {
    logger.error('❌ Proxy Error:', err.message);
    res.status(500).send(`Proxy failed: ${err.message}`);
  }
});


// ============================
// STRICT PROXY (HLS REWRITE)
// ============================
logger.info("STRICT ROUTE LOADED");
app.get('/strict-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing URL');

  logger.info('🛡️ SUPER HLS Proxy ->', targetUrl);
  logger.info("STRICT ROUTE LOADED");

  try {
    const response = await axios({
      method: 'GET',
      url: targetUrl,
      responseType: 'arraybuffer', // IMPORTANT
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
        'Referer': 'https://google.com',
        'Origin': 'https://google.com',
        'Range': 'bytes=0-',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      maxRedirects: 5,
      timeout: 10000,
    });

    const contentType =
      response.headers['content-type'] ||
      'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(response.data);

  } catch (error) {
    logger.error('❌ SUPER HLS Error:', error.code, error.message);
    res.status(500).send("Proxy error");
  }
});


app.listen(5000, () => {
  logger.info('✅ Proxy running on http://localhost:5000');
});
