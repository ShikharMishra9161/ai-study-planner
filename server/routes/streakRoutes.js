const express = require("express");
const auth    = require("../middleware/auth");
const Task    = require("../models/Task");

const router = express.Router();

// ── Get Streak Data ───────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    // Get all completed tasks sorted by date
    const doneTasks = await Task.find({
      userId: req.user,
      status: "done",
    }).select("updatedAt").sort({ updatedAt: -1 });

    if (doneTasks.length === 0) {
      return res.json({
        currentStreak: 0,
        longestStreak: 0,
        totalDaysStudied: 0,
        lastStudied: null,
        weekActivity: buildWeekActivity([]),
        monthActivity: buildMonthActivity([]),
      });
    }

    // Get unique dates (YYYY-MM-DD) when tasks were completed
    const uniqueDates = [
      ...new Set(
        doneTasks.map((t) => {
          const d = new Date(t.updatedAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })
      ),
    ].sort((a, b) => new Date(b) - new Date(a)); // newest first

    // Calculate current streak
    let currentStreak = 0;
    const today     = new Date();
    const todayStr  = formatDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    // Streak counts if studied today OR yesterday (to not break streak at midnight)
    const streakStartsFrom =
      uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr
        ? uniqueDates[0]
        : null;

    if (streakStartsFrom) {
      currentStreak = 1;
      let checkDate = new Date(streakStartsFrom);

      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDay = new Date(checkDate);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayStr = formatDate(prevDay);

        if (uniqueDates[i] === prevDayStr) {
          currentStreak++;
          checkDate = prevDay;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak ever
    let longestStreak = 0;
    let tempStreak    = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const curr = new Date(uniqueDates[i - 1]);
      const prev = new Date(uniqueDates[i]);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak, 1);

    res.json({
      currentStreak,
      longestStreak,
      totalDaysStudied: uniqueDates.length,
      lastStudied:      uniqueDates[0] || null,
      weekActivity:     buildWeekActivity(uniqueDates),
      monthActivity:    buildMonthActivity(uniqueDates),
    });

  } catch (error) {
    console.error("Streak error:", error);
    res.status(500).json({ message: "Error calculating streak", error: error.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────
function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildWeekActivity(uniqueDates) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    days.push({
      date:   dateStr,
      active: uniqueDates.includes(dateStr),
      label:  d.toLocaleDateString("en", { weekday: "short" }),
    });
  }
  return days;
}

function buildMonthActivity(uniqueDates) {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    days.push({
      date:   dateStr,
      active: uniqueDates.includes(dateStr),
    });
  }
  return days;
}

module.exports = router;