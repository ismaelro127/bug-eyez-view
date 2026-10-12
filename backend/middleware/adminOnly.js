export default function adminOnly(req, res, next) {
  try {
    const isAdmin = !!req.user?.roles?.admin;
    if (!isAdmin) return res.status(403).json({ error: "ADMINS_ONLY" });
    next();
  } catch (err) {
    logger.error("adminOnly error:", err);
    res.status(500).json({ error: "ADMIN_ONLY_FAILED" });
  logger.info("JWT DECODED PAYLOAD:", decoded);
}
}
