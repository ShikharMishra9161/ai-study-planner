const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const User     = require("../models/User");
const auth     = require("../middleware/auth");
const {
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
  hashToken: hashRefreshToken,
  publicUser,
  startSession,
} = require("../utils/authTokens");

const router = express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateRegisterPayload({ name, email, password }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    return "Name is required";
  }

  if (!email || typeof email !== "string" || !normalizeEmail(email)) {
    return "Email is required";
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return null;
}

function validateLoginPayload({ email, password }) {
  if (!email || typeof email !== "string" || !normalizeEmail(email)) {
    return "Email is required";
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return null;
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const validationMessage = validateRegisterPayload({ name, email, password });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const validationMessage = validateLoginPayload({ email, password });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "This account uses Google or GitHub sign-in" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json(await startSession(res, user));
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken: bodyToken } = req.body;
    const refreshToken = bodyToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (!user.refreshTokenHash || user.refreshTokenHash !== hashRefreshToken(refreshToken)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const token = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user);
    user.refreshTokenHash = hashRefreshToken(nextRefreshToken);
    await user.save();

    setRefreshCookie(res, nextRefreshToken);

    res.json({ token, user: publicUser(user) });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token", error: error.message });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.header("Authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!accessToken) {
      return res.status(401).json({ message: "Access token is required" });
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Invalid user" });
    }

    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (refreshToken && user.refreshTokenHash && user.refreshTokenHash !== hashRefreshToken(refreshToken)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    user.refreshTokenHash = null;
    await user.save();
    res.clearCookie("refreshToken", { path: "/" });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(401).json({ message: "Invalid token", error: error.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    res.json({ user: req.userData });
  } catch (error) {
    res.status(500).json({ message: "Failed to load profile", error: error.message });
  }
});

router.get("/admin-check", auth, (req, res) => {
  if (req.userData.role !== "admin") {
    return res.status(403).json({ message: "Access denied: admin role required" });
  }

  return res.json({ ok: true, role: req.userData.role });
});

module.exports = router;