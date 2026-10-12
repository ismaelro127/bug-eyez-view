import crypto from "crypto";
import User from "../models/User.js";
import { sendVerificationEmail } from "./emailService.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRawVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createAndSendVerificationEmail(user) {
  const rawToken = createRawVerificationToken();
  const tokenHash = hashToken(rawToken);

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = new Date(Date.now() + TOKEN_TTL_MS);
  user.lastVerificationEmailAt = new Date();

  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const verificationUrl = `${frontendUrl}/verify-email?token=${rawToken}`;
  console.log("DEV VERIFY LINK:", verificationUrl);
  try {
  await sendVerificationEmail({
    to: user.email,
    verificationUrl,
  });

  console.log("✅ Verification email send attempted:", user.email);
} catch (err) {
  console.error("❌ Verification email failed:", err);
  throw err;
}
  return true;
}

export async function verifyEmailToken(rawToken) {
  if (!rawToken) {
    return { success: false, error: "MISSING_TOKEN" };
  }

  const tokenHash = hashToken(rawToken);

  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    return { success: false, error: "INVALID_OR_EXPIRED_TOKEN" };
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;

  await user.save();

  return {
    success: true,
    user,
  };
}