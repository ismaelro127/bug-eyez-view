export default function adminEnabled(req, res, next) {
  if (process.env.ADMIN_ENABLED !== "true") {
    return res.status(404).json({ error: "NOT_FOUND" });
  }
  next();
}
