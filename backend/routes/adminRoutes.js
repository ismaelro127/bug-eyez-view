// =====================================================
// ADMIN: abuse stats endpoint — preserved (stubbed helper)
// =====================================================
app.get("/api/admin/user/:userId/abuse", authMiddleware, async (req, res) => {
  try {
    const stats = await getAbuseStats(req.params.userId);
    res.json(stats || {});
  } catch (err) {
    logger.error("❌ ABUSE STATS ERROR:", err);
    res.status(500).json({ error: "ABUSE_STATS_FAILED" });
  }
});
