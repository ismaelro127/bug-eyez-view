export default function internalOnly(req, res, next) {
  const key = req.headers["x-internal-key"];
  const expected = process.env.INTERNAL_API_KEY;

  // Must have key
  if (!expected || key !== expected) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  // Must be local caller (extra safety)
  const ip = req.ip || "";
  const isLocal =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.endsWith("127.0.0.1");

  if (!isLocal) {
    return res.status(403).json({ error: "LOCAL_ONLY" });
  }

  next();
}
