const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function auth(req, res, next) {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user._id;
    req.userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "student",
    };
    req.userRole = req.userData.role;

    next();
  } catch {
    res.status(401).json({ message: "Token is not valid" });
  }
}

auth.requireRole = (requiredRole) => (req, res, next) => {
  const role = req.userData?.role || req.userRole;
  if (!role || role !== requiredRole) {
    return res.status(403).json({ message: `Access denied: ${requiredRole} role required` });
  }

  next();
};

module.exports = auth;
