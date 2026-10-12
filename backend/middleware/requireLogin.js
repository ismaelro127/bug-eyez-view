import authenticateToken from "./authenticateToken.js";

export default function requireLogin(req, res, next) {
  authenticateToken(req, res, (err) => {
    if (err) return res.status(401).json({ message: "Login required" });
    next();
  });
}
