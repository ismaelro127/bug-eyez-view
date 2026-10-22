import puppeteer from "puppeteer";
import http from "http";
import crypto from "crypto";
import { logger } from "../utils/logger.js";

const DEFAULT_TIMEOUT_MS = 15000;
const PLAYER_SETTLE_MS = 5000;

let verificationServer = null;
let verificationServerPort = null;
let verificationServerPromise = null;

const pendingTokens = new Map();

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

function buildVerifierPage(videoId, token) {
  const safeVideoId = JSON.stringify(videoId);
  const safeToken = JSON.stringify(token);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="referrer" content="origin" />
  <title>Bug Eyez YouTube Verification</title>
</head>
<body>
  <div id="player"></div>

  <script>
    const videoId = ${safeVideoId};
    const token = ${safeToken};

    let finalSent = false;

    function report(payload) {
      if (finalSent) return;

      fetch("/result/" + token, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }

    function finish(payload) {
      if (finalSent) return;
      finalSent = true;
      report(payload);
    }

    window.onYouTubeIframeAPIReady = function () {
      new YT.Player("player", {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          playsinline: 1,
          rel: 0
        },

        events: {
          onReady: function (event) {
            try {
              event.target.mute();
              event.target.playVideo();
            } catch (_) {}

            report({
              type: "ready"
            });
          },

          onStateChange: function (event) {
            const state = event.data;

            if (
              state === YT.PlayerState.PLAYING ||
              state === YT.PlayerState.BUFFERING
            ) {
              finish({
                type: "playable",
                state
              });
            }
          },

          onError: function (event) {
            finish({
              type: "error",
              errorCode: String(event.data)
            });
          }
        }
      });
    };

    setTimeout(function () {
      finish({
        type: "timeout"
      });
    }, ${DEFAULT_TIMEOUT_MS});
  </script>

  <script src="https://www.youtube.com/iframe_api"></script>
</body>
</html>`;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 10000) {
        reject(new Error("Verifier result body too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleVerifierRequest(req, res) {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || "127.0.0.1"}`
  );

  if (
    req.method === "GET" &&
    requestUrl.pathname === "/verify"
  ) {
    const videoId = requestUrl.searchParams.get("v");
    const token = requestUrl.searchParams.get("token");

    if (
      !videoId ||
      !token ||
      !pendingTokens.has(token)
    ) {
      res.writeHead(400, {
        "Content-Type": "text/plain; charset=utf-8",
      });

      res.end("Invalid verification request");
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "origin",
    });

    res.end(buildVerifierPage(videoId, token));
    return;
  }

  if (
    req.method === "POST" &&
    requestUrl.pathname.startsWith("/result/")
  ) {
    const token = requestUrl.pathname
      .slice("/result/".length)
      .trim();

    const pending = pendingTokens.get(token);

    if (!pending) {
      res.writeHead(404);
      res.end();
      return;
    }

    try {
      const rawBody = await readRequestBody(req);
      const payload = JSON.parse(rawBody || "{}");

      pending.handleResult(payload);

      res.writeHead(204);
      res.end();
    } catch (err) {
      logger.warn(
        { err },
        "Invalid YouTube verifier result"
      );

      res.writeHead(400);
      res.end();
    }

    return;
  }

  res.writeHead(404);
  res.end();
}

async function ensureVerificationServer() {
  if (
    verificationServer &&
    verificationServerPort
  ) {
    return verificationServerPort;
  }

  if (verificationServerPromise) {
    return verificationServerPromise;
  }

  verificationServerPromise = new Promise(
    (resolve, reject) => {
      const server = http.createServer(
        (req, res) => {
          handleVerifierRequest(req, res).catch(
            (err) => {
              logger.error(
                { err },
                "YouTube verifier HTTP error"
              );

              if (!res.headersSent) {
                res.writeHead(500);
              }

              res.end();
            }
          );
        }
      );

      server.once("error", reject);

      server.listen(
        0,
        "127.0.0.1",
        () => {
          const address = server.address();

          if (
            !address ||
            typeof address === "string"
          ) {
            reject(
              new Error(
                "Unable to determine verifier port"
              )
            );
            return;
          }

          verificationServer = server;
          verificationServerPort =
            address.port;

          logger.info(
            {
              port: verificationServerPort,
            },
            "YouTube verifier HTTP server ready"
          );

          resolve(verificationServerPort);
        }
      );
    }
  );

  try {
    return await verificationServerPromise;
  } finally {
    verificationServerPromise = null;
  }
}

export async function verifyYouTubeVideo(
  videoId,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {}
) {
  if (
    !videoId ||
    typeof videoId !== "string"
  ) {
    return {
      verified: false,
      playable: false,
      reason: "missing_video_id",
      errorCode: null,
      durationMs: 0,
    };
  }

  const startedAt = Date.now();
  const port = await ensureVerificationServer();
  const token = createToken();

  let browser = null;
  let timeoutHandle = null;

  try {
    const resultPromise = new Promise(
      (resolve) => {
        let readySeen = false;
        let settled = false;

        const finish = (result) => {
          if (settled) return;
          settled = true;

          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }

          pendingTokens.delete(token);

          resolve({
            ...result,
            durationMs:
              Date.now() - startedAt,
          });
        };

        pendingTokens.set(token, {
          handleResult(payload) {
            if (payload?.type === "ready") {
              readySeen = true;
              return;
            }

            if (
              payload?.type === "playable"
            ) {
              finish({
                verified: true,
                playable: true,
                reason: "youtube_playable",
                errorCode: null,
              });

              return;
            }

            if (payload?.type === "error") {
              finish({
                verified: true,
                playable: false,
                reason: "youtube_player_error",
                errorCode:
                  payload.errorCode ||
                  "UNKNOWN",
              });

              return;
            }

            if (payload?.type === "timeout") {
              finish({
                verified: false,
                playable: false,
                reason: readySeen
                  ? "player_ready_but_not_playable"
                  : "youtube_timeout",
                errorCode: null,
              });
            }
          },
        });

        timeoutHandle = setTimeout(
          () => {
            finish({
              verified: false,
              playable: false,
              reason: readySeen
                ? "player_ready_but_not_playable"
                : "verification_timeout",
              errorCode: null,
            });
          },
          timeoutMs + PLAYER_SETTLE_MS
        );
      }
    );

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    const page = await browser.newPage();

    await page.goto(
      `http://127.0.0.1:${port}/verify?v=${encodeURIComponent(
        videoId
      )}&token=${encodeURIComponent(token)}`,
      {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      }
    );

    return await resultPromise;
  } catch (err) {
    pendingTokens.delete(token);

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    logger.error(
      {
        err,
        videoId,
      },
      "YouTube verification failed"
    );

    return {
      verified: false,
      playable: false,
      reason: "verification_failed",
      errorCode: null,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    pendingTokens.delete(token);

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}