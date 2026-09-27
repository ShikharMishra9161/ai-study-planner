const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("node:crypto");
const User     = require("../models/User");
const auth     = require("../middleware/auth");

const router = express.Router();
const ACCESS_TOKEN_TTL = "7d";
const REFRESH_TOKEN_TTL = "30d";
const isProduction = process.env.NODE_ENV === "production";

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function signAccessToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function signRefreshToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokenHash = hashRefreshToken(refreshToken);
    await user.save();

    setRefreshCookie(res, refreshToken);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || "student" },
    });
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

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || "student" },
    });
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