export default function checkSession(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Session expired or invalid." });
  }
  next();
}
