// =====================================================
// ENV
// =====================================================
import "dotenv/config";

import http from "http";
import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { startChannelEventWorker } from "./workers/channelEventWorker.js";
import { getRedis } from "./config/redis.js";
import publicChannels from "./routes/publicChannels.js";

import app from "./app.js";
import { logger } from "./utils/logger.js";
import { startAIService, stopAIService } from "./utils/aiService.js";
import { startChannelHealthWorker } from "./workers/channelHealthWorker.js";
import { startCronJobs, stopCronJobs } from "./jobs/cronJobs.js";
import proxyRoutes from "./routes/proxyRoutes.js";

const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL;
const RAW_CORS_ORIGINS =
  process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://127.0.0.1:3000,http://192.168.12.143:3000";

const ALLOWED_ORIGINS = RAW_CORS_ORIGINS
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(proxyRoutes);
app.use("/api/public", publicChannels);

// =====================================================
// BOOTSTRAP
// =====================================================

async function startServer() {
  try {
    logger.info("Starting server bootstrap...");

    // ======================
    // MongoDB
    // ======================
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, {
        retryWrites: true,
        w: "majority",
      });
      logger.info("MongoDB connected");
    } else {
      logger.warn("MONGO_URI not defined");
    }

    const httpServer = http.createServer(app);

    // ======================
    // Socket.IO
    // ======================
    const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});

    // ======================
    // Redis Adapter (Horizontal Scale Safe)
    // ======================
    if (process.env.REDIS_URL) {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      await pubClient.connect();
      await subClient.connect();

      io.adapter(createAdapter(pubClient, subClient));

      logger.info("Socket.IO Redis adapter connected");
    } else {
      logger.warn("REDIS_URL not set — running single-instance sockets");
    }

    io.on("connection", (socket) => {
      logger.info({ socketId: socket.id }, "Socket connected");
    });

    // ======================
    // Background Services
    // ======================

startAIService();
startCronJobs();

const redis = getRedis();

if (redis) {
  redis.once("ready", () => {
    logger.info("🚀 Redis ready — starting channel workers");

    startChannelEventWorker();
    startChannelHealthWorker?.({ io });
  });
} else {
  // fallback if Redis disabled
  startChannelEventWorker();
  startChannelHealthWorker?.({ io });
}
    // ======================
    // Health Endpoint
    // ======================
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        redis: process.env.REDIS_URL ? "configured" : "not-configured",
      });
    });

    
    // ======================
    // Start Server
    // ======================
    httpServer.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
  logger.info(`Local backend: http://localhost:${PORT}`);
  logger.info(`LAN backend: http://192.168.12.143:${PORT}`);
});

    // ======================
    // Graceful Shutdown
    // ======================
    const shutdown = async () => {
      try {
        logger.info("Graceful shutdown starting...");

        stopCronJobs?.();
        stopAIService?.();
// stopHealthWorker?.();
        io.close();

        await mongoose.connection.close();

        httpServer.close(() => {
          logger.info("HTTP server closed");
          process.exit(0);
        });

      } catch (e) {
        logger.error({ e }, "Shutdown error");
        process.exit(1);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (err) {
    logger.error({ err }, "Server startup failed");
    process.exit(1);
  }
}

// =====================================================
// Global Crash Protection
// =====================================================
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.fatal({ err }, "Unhandled Rejection");
  process.exit(1);
});

startServer();