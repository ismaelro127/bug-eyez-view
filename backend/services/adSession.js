import crypto from "crypto";

const SECRET = process.env.AD_SESSION_SECRET;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function createAdSessionId({ userId, channelId }) {
  const ts = Date.now();
  const payload = `${userId}:${channelId}:${ts}`;

  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 16); // short but strong

  return `ad_${ts}_${channelId}_${sig}`;
}

export function verifyAdSessionId({ adSessionId, userId }) {
  if (typeof adSessionId !== "string") return false;

  const parts = adSessionId.split("_");
  if (parts.length < 4) return false;

  const [, tsStr, channelId, sig] = parts;
  const ts = Number(tsStr);

  if (!ts || Date.now() - ts > TTL_MS) return false;

  const payload = `${userId}:${channelId}:${ts}`;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 16);

  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expected)
  );
}
