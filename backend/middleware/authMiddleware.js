import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { logger } from "../utils/logger.js";

const TOKEN_COOKIE_NAMES = [
  "token",
  "accessToken",
  "authToken",
  "access_token",
  "jwt",
];

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const headerToken = authHeader.slice(7).trim();
    if (headerToken && headerToken !== "null" && headerToken !== "undefined") {
      return headerToken;
    }
  }

  for (const cookieName of TOKEN_COOKIE_NAMES) {
    const cookieToken = req.cookies?.[cookieName];

    if (
      cookieToken &&
      cookieToken !== "null" &&
      cookieToken !== "undefined"
    ) {
      return cookieToken;
    }
  }

  return null;
}

const authMiddleware = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET missing");
      return res.status(500).json({ error: "SERVER_MISCONFIGURED" });
    }

    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ error: "NO_AUTH_TOKEN" });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        error:
          err.name === "TokenExpiredError"
            ? "TOKEN_EXPIRED"
            : "INVALID_TOKEN",
      });
    }

    const userId = decoded.sub || decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({ error: "INVALID_TOKEN_PAYLOAD" });
    }

    const user = await User.findById(userId)
      .select(
        "_id email username displayName avatarUrl provider roles emailVerified tokenVersion createdAt updatedAt"
      )
      .lean();

    if (!user) {
      return res.status(401).json({ error: "USER_NOT_FOUND" });
    }

    const tokenVersionFromJwt =
      typeof decoded.tokenVersion === "number" ? decoded.tokenVersion : 0;

    const userTokenVersion =
      typeof user.tokenVersion === "number" ? user.tokenVersion : 0;

    if (tokenVersionFromJwt !== userTokenVersion) {
      return res.status(401).json({ error: "TOKEN_REVOKED" });
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      roles: user.roles,
      emailVerified: user.emailVerified,
      tokenVersion: user.tokenVersion || 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    next();
  } catch (err) {
    logger.error({ err }, "Auth middleware error");
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
};

export default authMiddleware;