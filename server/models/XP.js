const mongoose = require("mongoose");

const xpHistorySchema = new mongoose.Schema({
  action:    { type: String, required: true }, // "complete_task", "pass_quiz", etc
  points:    { type: Number, required: true },
  message:   { type: String, required: true }, // "Completed a task +10 XP"
  earnedAt:  { type: Date, default: Date.now },
});

const xpSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  totalXP:   { type: Number, default: 0 },
  level:     { type: Number, default: 1 },
  history:   [xpHistorySchema],
}, { timestamps: true });

// ── XP thresholds per level ───────────────────────────────────────────
xpSchema.statics.getLevelInfo = function(totalXP) {
  const levels = [
    { level: 1, title: "Beginner",   minXP: 0,    maxXP: 199,   icon: "🌱" },
    { level: 2, title: "Student",    minXP: 200,  maxXP: 499,   icon: "📖" },
    { level: 3, title: "Scholar",    minXP: 500,  maxXP: 999,   icon: "🎓" },
    { level: 4, title: "Expert",     minXP: 1000, maxXP: 1999,  icon: "⚡" },
    { level: 5, title: "Master",     minXP: 2000, maxXP: 3999,  icon: "🏆" },
    { level: 6, title: "Legend",     minXP: 4000, maxXP: 99999, icon: "👑" },
  ];

  const current = levels.findLast(l => totalXP >= l.minXP) || levels[0];
  const next    = levels.find(l => l.level === current.level + 1);

  const progressXP  = totalXP - current.minXP;
  const requiredXP  = next ? next.minXP - current.minXP : 1;
  const progressPct = Math.min(Math.round((progressXP / requiredXP) * 100), 100);

  return {
    level:       current.level,
    title:       current.title,
    icon:        current.icon,
    totalXP,
    progressXP,
    requiredXP,
    progressPct,
    nextLevel:   next ? next.title : null,
    nextLevelXP: next ? next.minXP : null,
  };
};

module.exports = mongoose.model("XP", xpSchema);