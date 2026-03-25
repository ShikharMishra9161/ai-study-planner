import { useEffect, useState } from "react";
import API from "../utils/api";

export default function StreakCard() {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState("week"); // "week" | "month"

  useEffect(() => {
    fetchStreak();
  }, []);

  const fetchStreak = async () => {
    try {
      const res = await API.get("/streak");
      setStreak(res.data);
    } catch {
      setStreak(null);
    }
    setLoading(false);
  };

  if (loading) return <div className="skeleton h-48 w-full rounded-2xl" />;
  if (!streak)  return null;

  const activity = view === "week" ? streak.weekActivity : streak.monthActivity;

  // Flame emoji based on streak length
  const flameEmoji =
    streak.currentStreak >= 30 ? "🔥🔥🔥" :
    streak.currentStreak >= 14 ? "🔥🔥"   :
    streak.currentStreak >= 1  ? "🔥"      : "💤";

  const streakColor =
    streak.currentStreak >= 14 ? "text-rose-400"   :
    streak.currentStreak >= 7  ? "text-amber-400"  :
    streak.currentStreak >= 1  ? "text-orange-400" : "text-slate-500";

  return (
    <div className="card p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-semibold text-white">Study Streak</h3>
        {/* Week / Month toggle */}
        <div className="flex gap-1 bg-slate-800/60 rounded-lg p-0.5">
          {["week", "month"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all duration-200 capitalize
                ${view === v ? "bg-slate-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Streak stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center">
          <p className={`font-display font-bold text-3xl leading-none mb-1 ${streakColor}`}>
            {streak.currentStreak}
          </p>
          <p className="text-xs text-slate-500">Current {flameEmoji}</p>
        </div>
        <div className="text-center border-x border-slate-800">
          <p className="font-display font-bold text-3xl text-white leading-none mb-1">
            {streak.longestStreak}
          </p>
          <p className="text-xs text-slate-500">Best streak</p>
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-3xl text-white leading-none mb-1">
            {streak.totalDaysStudied}
          </p>
          <p className="text-xs text-slate-500">Days studied</p>
        </div>
      </div>

      {/* Activity grid */}
      {view === "week" ? (
        // Week view — larger boxes with day labels
        <div className="flex gap-2 justify-between">
          {activity.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-full aspect-square rounded-lg transition-all duration-300
                  ${day.active
                    ? "bg-gradient-to-br from-cyan-400 to-violet-500"
                    : "bg-slate-800/60"
                  }`}
                style={{ animationDelay: `${i * 0.05}s` }}
                title={day.date}
              />
              <span className="text-[10px] text-slate-600 font-medium">{day.label}</span>
            </div>
          ))}
        </div>
      ) : (
        // Month view — small grid like GitHub contributions
        <div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
            {activity.map((day, i) => (
              <div
                key={i}
                className={`aspect-square rounded-sm transition-all duration-200
                  ${day.active
                    ? "bg-gradient-to-br from-cyan-400 to-violet-500"
                    : "bg-slate-800/60"
                  }`}
                title={day.date}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-slate-600">30 days ago</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-600">Less</span>
              <div className="flex gap-0.5">
                {["bg-slate-800/60", "bg-cyan-400/30", "bg-cyan-400/60", "bg-cyan-400"].map((c, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                ))}
              </div>
              <span className="text-[10px] text-slate-600">More</span>
            </div>
            <span className="text-[10px] text-slate-600">Today</span>
          </div>
        </div>
      )}

      {/* Last studied */}
      {streak.lastStudied && (
        <p className="text-xs text-slate-600 text-center mt-4">
          Last studied:{" "}
          <span className="text-slate-400 font-medium">
            {new Date(streak.lastStudied).toLocaleDateString("en", {
              weekday: "long", month: "short", day: "numeric"
            })}
          </span>
        </p>
      )}

      {/* Motivational message */}
      {streak.currentStreak === 0 && (
        <div className="mt-3 text-center p-3 bg-slate-800/40 rounded-xl">
          <p className="text-xs text-slate-400">Complete a task today to start your streak! 💪</p>
        </div>
      )}
      {streak.currentStreak >= 7 && (
        <div className="mt-3 text-center p-3 bg-gradient-to-r from-cyan-400/10 to-violet-400/10 border border-cyan-400/20 rounded-xl">
          <p className="text-xs text-cyan-400 font-semibold">
            {streak.currentStreak} day streak! You're on fire! 🔥
          </p>
        </div>
      )}
    </div>
  );
}