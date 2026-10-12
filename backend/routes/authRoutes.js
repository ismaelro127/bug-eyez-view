import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { logger } from "../utils/logger.js";
import {
  createAndSendVerificationEmail,
  verifyEmailToken,
} from "../services/emailVerificationService.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "24h";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

/**
 * Normalize email
 */
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/**
 * Register
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    const normalizedEmail = normalizeEmail(email);

    if (password.length < 8) {
      return res.status(400).json({ error: "WEAK_PASSWORD" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: "EMAIL_EXISTS" });
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
      roles: {
        admin: false,
        premium: false,
      },
    });

    await createAndSendVerificationEmail(user);

    logger.info({ userId: user._id }, "User registered, verification email sent");

    res.status(201).json({
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
    res.status(500).json({ error: "REGISTER_FAILED" });
  }
});

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

    res.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    logger.error({ err }, "EMAIL_VERIFY_FAILED");
    res.status(500).json({ error: "EMAIL_VERIFY_FAILED" });
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "EMAIL_REQUIRED" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        message: "Email is already verified.",
      });
    }

    if (
      user.lastVerificationEmailAt &&
      Date.now() - new Date(user.lastVerificationEmailAt).getTime() < 60_000
    ) {
      return res.status(429).json({
        error: "PLEASE_WAIT_BEFORE_RESENDING",
      });
    }

    await createAndSendVerificationEmail(user);

    res.json({
      success: true,
      message: "Verification email resent.",
    });
  } catch (err) {
    logger.error({ err }, "RESEND_VERIFICATION_FAILED");
    res.status(500).json({ error: "RESEND_VERIFICATION_FAILED" });
  }
});

/**
 * Login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      logger.warn({ email: normalizedEmail }, "Invalid login attempt");
      return res.status(400).json({ error: "INVALID_CREDENTIALS" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn({ userId: user._id }, "Invalid password attempt");
      return res.status(400).json({ error: "INVALID_CREDENTIALS" });
    }
if (!user.emailVerified) {
  return res.status(403).json({
    error: "EMAIL_NOT_VERIFIED",
    message: "Please verify your email before logging in.",
  });
}
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        roles: user.roles,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    logger.info({ userId: user._id }, "User logged in");

    res.json({
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
  token,
});

  } catch (err) {
    logger.error({ err }, "LOGIN_FAILED");
    res.status(500).json({ error: "LOGIN_FAILED" });
  }
});

/**
 * Logout (stateless JWT)
 */
router.post("/logout", (req, res) => {
  res.json({ success: true });
});

/**
 * Current user
 */
router.get("/me", async (req, res) => {
  res.status(501).json({ error: "USE_AUTH_MIDDLEWARE_ROUTE" });
});

export default router;