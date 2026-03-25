const express = require("express");
const XP      = require("../models/XP");
const User    = require("../models/User");
const auth    = require("../middleware/auth");

const router = express.Router();

// ── XP rewards per action ─────────────────────────────────────────────
const XP_REWARDS = {
  complete_task:      10,
  generate_tasks:     15,
  pass_quiz:          50,  // score >= 70%
  attempt_quiz:       20,  // any quiz attempt
  summarize_notes:    20,
  chat_message:        5,
  login_streak_7:    100,  // 7 day streak bonus
  login_streak_30:   500,  // 30 day streak bonus
};

// ── Helper: award XP to a user ────────────────────────────────────────
async function awardXP(userId, action, customMessage = null) {
  try {
    const points  = XP_REWARDS[action] || 0;
    if (!points) return null;

    const messages = {
      complete_task:    `Completed a task +${points} XP`,
      generate_tasks:   `Generated AI tasks +${points} XP`,
      pass_quiz:        `Passed a quiz +${points} XP`,
      attempt_quiz:     `Attempted a quiz +${points} XP`,
      summarize_notes:  `Summarized notes +${points} XP`,
      chat_message:     `Used AI chat +${points} XP`,
      login_streak_7:   `7-day streak bonus! +${points} XP 🔥`,
      login_streak_30:  `30-day streak legend! +${points} XP 👑`,
    };

    // Find or create XP record
    let xpRecord = await XP.findOne({ userId });
    if (!xpRecord) {
      xpRecord = new XP({ userId, totalXP: 0, level: 1 });
    }

    const oldLevel  = xpRecord.level;
    xpRecord.totalXP += points;

    // Recalculate level
    const levelInfo = XP.getLevelInfo(xpRecord.totalXP);
    xpRecord.level  = levelInfo.level;

    // Add to history
    xpRecord.history.push({
      action,
      points,
      message: customMessage || messages[action],
    });

    // Keep only last 50 history entries
    if (xpRecord.history.length > 50) {
      xpRecord.history = xpRecord.history.slice(-50);
    }

    await xpRecord.save();

    const leveledUp = xpRecord.level > oldLevel;

    return {
      pointsEarned: points,
      totalXP:      xpRecord.totalXP,
      level:        xpRecord.level,
      leveledUp,
      levelInfo,
    };
  } catch (err) {
    console.error("XP award error:", err.message);
    return null;
  }
}

// ── Get my XP ─────────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    let xpRecord = await XP.findOne({ userId: req.user });

    if (!xpRecord) {
      xpRecord = new XP({ userId: req.user, totalXP: 0, level: 1 });
      await xpRecord.save();
    }

    const levelInfo = XP.getLevelInfo(xpRecord.totalXP);

    res.json({
      ...levelInfo,
      history: xpRecord.history.slice(-10).reverse(), // last 10 entries
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching XP", error: error.message });
  }
});

// ── Get leaderboard ───────────────────────────────────────────────────
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const topXP = await XP.find()
      .sort({ totalXP: -1 })
      .limit(10)
      .populate("userId", "name");

    const leaderboard = topXP.map((x, i) => {
      const levelInfo = XP.getLevelInfo(x.totalXP);
      return {
        rank:     i + 1,
        name:     x.userId?.name || "Unknown",
        totalXP:  x.totalXP,
        level:    levelInfo.level,
        title:    levelInfo.title,
        icon:     levelInfo.icon,
        isMe:     x.userId?._id?.toString() === req.user.toString(),
      };
    });

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaderboard", error: error.message });
  }
});

// ── Award XP manually (internal use) ─────────────────────────────────
router.post("/award", auth, async (req, res) => {
  try {
    const { action } = req.body;
    const result = await awardXP(req.user, action);
    if (!result) return res.status(400).json({ message: "Invalid action" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error awarding XP", error: error.message });
  }
});

module.exports = { router, awardXP };