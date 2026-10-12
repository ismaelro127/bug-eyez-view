import crypto from "crypto";

export default function internalSignature(req, res, next) {
  const signature = req.headers["x-internal-signature"];
  const body = JSON.stringify(req.body || {});
  const secret = process.env.INTERNAL_SECRET;

  if (!signature || !secret) {
    return res.status(403).json({ error: "UNAUTHORIZED_INTERNAL" });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    return res.status(403).json({ error: "INVALID_SIGNATURE" });
  }

  next();
}