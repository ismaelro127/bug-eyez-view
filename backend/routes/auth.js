import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { logger } from "../utils/logger.js";
import {
  createAndSendVerificationEmail,
  verifyEmailToken,
} from "../services/emailVerificationService.js";

const router = express.Router();

// ================================
// ENV VALIDATION
// ================================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET missing");
}

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TTL_DAYS = 14;

// ================================
// RATE LIMITER
// ================================
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});

// ================================
// HELPERS
// ================================
function normalizeEmail(email) {
  return email?.trim().toLowerCase();
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      tokenVersion: user.tokenVersion || 0,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function makeRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// ================================
// REGISTER
// ================================
router.post("/register", authLimiter, async (req, res) => {
  try {
    console.log("🔥 ACTIVE VERIFY REGISTER ROUTE HIT");

    const { email, password, username } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "WEAK_PASSWORD" });
    }

    const normalizedEmail = normalizeEmail(email);

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return res.status(409).json({ error: "EMAIL_EXISTS" });
    }

    const finalUsername =
      username?.trim() || normalizedEmail.split("@")[0];

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: normalizedEmail,
      username: finalUsername,
      displayName: finalUsername,
      passwordHash,
      provider: "local",
      emailVerified: false,
      roles: { admin: false, premium: false },
    tokenVersion: {
  type: Number,
  default: 0,
},
});

    try {
      console.log("📧 Creating verification email for:", user.email);

      await createAndSendVerificationEmail(user);

      console.log("✅ Verification email function completed for:", user.email);
    } catch (emailErr) {
      logger.error({ emailErr }, "VERIFICATION_EMAIL_SEND_FAILED");

      return res.status(201).json({
        success: true,
        requiresVerification: true,
        emailSendFailed: true,
        message:
          "Account created, but verification email could not be sent. Use resend verification or check backend logs for the dev verification link.",
        user: {
          id: user._id.toString(),
          _id: user._id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          provider: user.provider,
          roles: user.roles,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    }

    logger.info({ userId: user._id }, "User registered, verification email sent");

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      message: "Account created. Please check your email to verify your account.",
      user: {
        id: user._id.toString(),
        _id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        roles: user.roles,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    logger.error({ err }, "REGISTER_FAILED");
    return res.status(500).json({ error: "REGISTER_FAILED" });
  }
});

// ================================
// VERIFY EMAIL
// ================================
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    const result = await verifyEmailToken(token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    logger.error({ err }, "EMAIL_VERIFY_FAILED");
    return res.status(500).json({ error: "EMAIL_VERIFY_FAILED" });
  }
});

// ================================
// LOGIN
// ================================
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    console.log("LOGIN EMAIL VERIFIED?", {
      email: user.email,
      emailVerified: user.emailVerified,
    });

    if (!user.emailVerified && !user.roles?.admin) {
      return res.status(403).json({
        error: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before logging in.",
      });
    }

    const accessToken = signAccessToken(user);

    const refreshToken = makeRefreshToken();
    const tokenHash = sha256(refreshToken);
    const expiresAt = new Date(
      Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      meta: { ip: req.ip, userAgent: req.headers["user-agent"] || null },
    });

    logger.info({ userId: user._id }, "User logged in");

    return res.json({
      user: {
        id: user._id.toString(),
        _id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        roles: user.roles,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    logger.error({ err }, "LOGIN_FAILED");
    return res.status(500).json({ error: "LOGIN_FAILED" });
  }
});


// ================================
// REFRESH
// ================================
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ error: "MISSING_REFRESH_TOKEN" });

    const tokenHash = sha256(refreshToken);

    const doc = await RefreshToken.findOne({
      tokenHash,
      revokedAt: null,
    });

    if (!doc) return res.status(401).json({ error: "INVALID_REFRESH" });

    if (doc.expiresAt.getTime() < Date.now())
      return res.status(401).json({ error: "REFRESH_EXPIRED" });

    const user = await User.findById(doc.userId).select("_id email username displayName avatarUrl provider roles createdAt updatedAt");
    if (!user) return res.status(401).json({ error: "USER_NOT_FOUND" });

    const accessToken = signAccessToken(user);

    // rotate refresh
    const newRefreshToken = makeRefreshToken();
    const newHash = sha256(newRefreshToken);

    await RefreshToken.updateOne(
      { _id: doc._id },
      { revokedAt: new Date() }
    );

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newHash,
      expiresAt: new Date(
        Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
      ),
      meta: { ip: req.ip, userAgent: req.headers["user-agent"] || null },
    });

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    logger.error({ err }, "REFRESH_FAILED");
    res.status(500).json({ error: "REFRESH_FAILED" });
  }
});

// ================================
// LOGOUT
// ================================
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ error: "MISSING_REFRESH_TOKEN" });

    const tokenHash = sha256(refreshToken);
    await RefreshToken.updateOne(
      { tokenHash },
      { revokedAt: new Date() }
    );

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "LOGOUT_FAILED");
    res.status(500).json({ error: "LOGOUT_FAILED" });
  }
});

// ================================
// CURRENT USER
// ================================
// ================================
// CURRENT USER
// ================================
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    id: req.user.id || req.user._id?.toString(),
    _id: req.user._id,
    email: req.user.email,
    username: req.user.username,
    displayName: req.user.displayName,
    avatarUrl: req.user.avatarUrl,
    provider: req.user.provider,
    roles: req.user.roles,
    emailVerified: req.user.emailVerified,
    createdAt: req.user.createdAt,
    updatedAt: req.user.updatedAt,
  });
});

export default router;