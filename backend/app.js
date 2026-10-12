import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import userPreferencesRoutes from "./routes/userPreferences.js";

import corsConfig from "./middleware/corsConfig.js";
import { globalLimiter, authLimiter } from "./middleware/rateLimiters.js";

import eventsRoutes from "./routes/events.js";
import payments from "./routes/payments.js";
import stripeWebhook from "./routes/stripeWebhook.js";
import creditsRoutes from "./services/credits.js";
import userStatusRoutes from "./routes/userStatus.js";
import adminRouter from "./routes/admin/index.js";
import authRoutes from "./routes/auth.js";
import channelRoutes from "./routes/channelRoutes.js";
import proxyRoutes from "./routes/proxyRoutes.js";
import dvrRoutes from "./routes/dvrRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import captionRoutes from "./routes/captionRoutes.js";
import userFeaturesRoutes from "./routes/userFeaturesRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";

const app = express();

// ================================
// Core Security
// ================================
app.set("trust proxy", 1);
app.use(helmet());
app.use(corsConfig);
app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// ================================
// Global Rate Limiting
// ================================
app.use(globalLimiter);

// ================================
// API Routes
// ================================
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/payments", payments);
app.use("/api/stripe", stripeWebhook);
app.use("/api/credits", creditsRoutes);
app.use("/api/user", userStatusRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/channels", channelRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/dvr", dvrRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/captions", captionRoutes);
app.use("/api/user-features", authMiddleware, userFeaturesRoutes);
app.use("/api/user-preferences", userPreferencesRoutes);

// ================================
// Root Health Check
// ================================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "BugEyezView backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ================================
// 404 Handler
// ================================
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ================================
// Global Error Handler
// ================================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

export default app;