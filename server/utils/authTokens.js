const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

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

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role || "student" };
}

// Issues a fresh access/refresh pair, stores the refresh hash and sets the cookie.
async function startSession(res, user) {
  const token = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  setRefreshCookie(res, refreshToken);
  return { token, user: publicUser(user) };
}

module.exports = {
  isProduction,
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
  hashToken,
  publicUser,
  startSession,
};
