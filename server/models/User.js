const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, default: null }, // hashed; null for OAuth-only accounts
  role:     { type: String, enum: ["student", "admin"], default: "student" },
  refreshTokenHash: { type: String, default: null },
  googleId: { type: String, unique: true, sparse: true },
  githubId: { type: String, unique: true, sparse: true },
  avatar:   { type: String, default: null },
  // One-time code handed to the client after an OAuth redirect, exchanged for tokens
  oauthCodeHash:    { type: String, default: null },
  oauthCodeExpires: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
