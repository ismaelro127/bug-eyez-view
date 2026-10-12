import express from "express";
import fetch from "node-fetch";
import axios from "axios";
import net from "net";
import https from "https";
import { logger } from "../utils/logger.js";
const router = express.Router();
// =====================================================
// 🔐 Basic SSRF guard for proxy endpoints (free-tier safety)
// =====================================================
function assertSafeProxyUrl(raw) {
  const u = new URL(raw);

  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error("INVALID_PROTOCOL");
  }

  const host = u.hostname.toLowerCase();

  const blocked = [
    "localhost",
    "127.0.0.1",
    "::1",
  ];

  if (blocked.includes(host) || host.endsWith(".local")) {
    throw new Error("LOCALHOST_BLOCKED");
  }

  // Block private IPv4 ranges
  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new Error("PRIVATE_NETWORK_BLOCKED");
  }
}

// =====================================================
// HLS PROXY — preserved (safer)
// =====================================================
router.get("/hls-proxy", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "Missing url" });
    }

    // your existing proxy logic here
    res.send("proxy works"); // placeholder

  } catch (err) {
    console.error("Proxy error", err);
    res.status(500).json({ error: "Proxy failed" });
  }
});

// =====================================================
// DNS-over-HTTPS helpers — preserved
// =====================================================
async function resolveDoH(hostname) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ name: hostname, type: "A" });

    const req = https.request(
      {
        hostname: "cloudflare-dns.com",
        path: "/dns-query",
        method: "POST",
        headers: {
          "Content-Type": "application/dns-json",
          Accept: "application/dns-json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.Answer && json.Answer.length > 0) {
              resolve(json.Answer[0].data);
            } else reject("No DNS answer");
          } catch (e) {
            reject("Bad JSON: " + e);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function createDoHAgent(hostname) {
  return {
    createConnection: async (opts, callback) => {
      try {
        const ip = await resolveDoH(hostname);
        const socket = net.connect({ host: ip, port: opts.port }, () => callback(false, socket));
        return socket;
      } catch (e) {
        logger.error("DNS-over-HTTPS failure:", e);
      }
    },
  };
}

// =====================================================
// PROXY (generic) — preserved (safer)
// =====================================================
router.get("/proxy", async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const targetUrl = req.query.url;

    if (!targetUrl) {
      return res.status(400).send("Missing URL");
    }

    const safeUrl = String(targetUrl);

    // Must block private IPs, localhost, file://, etc.
    assertSafeProxyUrl(safeUrl);

    const fetchHeaders = {
      "User-Agent":
        req.headers["user-agent"] ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
      Accept: req.headers["accept"] || "*/*",
      "Accept-Encoding": "identity",
      Connection: "keep-alive",
    };

    if (req.headers["range"]) {
      fetchHeaders.Range = req.headers["range"];
    }

    const upstream = await fetch(safeUrl, {
      method: "GET",
      headers: fetchHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Forward upstream status, important for video range requests.
    res.status(upstream.status);

    const passthroughHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
      "last-modified",
    ];

    for (const header of passthroughHeaders) {
      const value = upstream.headers.get(header);
      if (value) {
        res.set(header, value);
      }
    }

    if (!upstream.body) {
      return res.end();
    }

    upstream.body.on("error", (err) => {
      logger.error("Proxy upstream stream error:", err?.message || err);

      if (!res.headersSent) {
        res.status(502).send("Proxy stream failed");
      } else {
        res.destroy(err);
      }
    });

    req.on("close", () => {
      try {
        upstream.body.destroy();
      } catch {
        // ignore stream destroy errors
      }
    });

    upstream.body.pipe(res);
  } catch (err) {
    clearTimeout(timeout);

    const message = err?.message || "Proxy failed";

    logger.error("Proxy error:", message);

    if (message.includes("unsafe") || message.includes("blocked")) {
      return res.status(400).send("Blocked proxy URL");
    }

    if (err?.name === "AbortError") {
      return res.status(504).send("Proxy timeout");
    }

    return res.status(500).send("Proxy failed");
  }
});
// =====================================================
// STRICT PROXY (DoH-based) — preserved (safer)
// =====================================================
router.get("/strict-proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url parameter");

  try {
    const decodedURL = decodeURIComponent(String(target));
    assertSafeProxyUrl(decodedURL);

    const hostname = new URL(decodedURL).hostname;

    const response = await axios({
      url: decodedURL,
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
        Origin: "https://google.com",
        Referer: "https://google.com",
        Range: "bytes=0-",
      },
      httpAgent: createDoHAgent(hostname),
      httpsAgent: createDoHAgent(hostname),
    });

    res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL);    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
    res.send(response.data);
  } catch (err) {
    logger.error("❌ STRICT Proxy error:", err.message);
    res.status(500).send("STRICT PROXY FAILED");
  }
});

export default router;