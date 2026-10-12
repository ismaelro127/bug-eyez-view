app.post("/api/track/watch", authMiddleware, abuseGate, async (req, res) => {
  await assertNotAbusive({
    userId: req.user._id,
    action: "WATCH_HEARTBEAT",
  });

  await UserActivity.create({
    userId: req.user._id,
    action: "WATCH_HEARTBEAT",
    source: req.body.source,
    duration: req.body.duration,
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
  });

  res.json({ ok: true });
});
