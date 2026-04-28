const express = require("express");
const bcrypt  = require("bcryptjs");
const auth    = require("../middleware/auth");
const User    = require("../models/User");

const router = express.Router();

// ── Get Profile ───────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
});

// ── Update Name or Email ──────────────────────────────────────────────
router.put("/", auth, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check if email is taken by another user
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user } });
      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user,
      { name: name.trim(), ...(email && { email: email.trim() }) },
      { new: true }
    ).select("-password");

    res.json({ message: "Profile updated", user: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
});

// ── Change Password ───────────────────────────────────────────────────
router.put("/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error changing password", error: error.message });
  }
});

module.exports = router;