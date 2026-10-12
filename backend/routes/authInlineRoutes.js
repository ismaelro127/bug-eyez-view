import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "24h";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET missing");
}

/* ===============================
   Rate limiting (brute force guard)
================================= */
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});

/* ===============================
   Helpers
================================= */

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      roles: user.roles || {},
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/* ===============================
   Register
================================= */

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: "WEAK_PASSWORD" });
    }

    const normalizedEmail = normalizeEmail(email);

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return res.status(400).json({ error: "EMAIL_EXISTS" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      roles: {
        admin: false,
        premium: false,
      },
    });

    const token = signToken(user);

    logger.info({ userId: user._id }, "User registered");

    res.status(201).json({
      user: {
        _id: user._id,
        email: user.email,
        roles: user.roles,
      },
      token,
    });

  } catch (err) {
    logger.error({ err }, "REGISTER_FAILED");
    res.status(500).json({ error: "REGISTER_FAILED" });
  }
});

/* ===============================
   Login
================================= */

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "INVALID_INPUT" });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      logger.warn({ email: normalizedEmail }, "Invalid login email");
      return res.status(400).json({ error: "INVALID_CREDENTIALS" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn({ userId: user._id }, "Invalid password attempt");
      return res.status(400).json({ error: "INVALID_CREDENTIALS" });
    }

    const token = signToken(user);

    logger.info({ userId: user._id }, "User logged in");

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        roles: user.roles,
      },
      token,
    });

  } catch (err) {
    logger.error({ err }, "LOGIN_FAILED");
    res.status(500).json({ error: "LOGIN_FAILED" });
  }
});

/* ===============================
   Current user
================================= */

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    _id: req.user._id,
    email: req.user.email,
    roles: req.user.roles,
  });
});

export default router;