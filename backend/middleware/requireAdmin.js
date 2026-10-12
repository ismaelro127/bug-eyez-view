export default function requireAdmin(req, res, next) {
  try {
    if (!req.user?.roles?.admin) {
      return res.status(403).json({ error: "ADMIN_ONLY" });
    }
    next();
  } catch (err) {
    logger.error("requireAdmin error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
}
