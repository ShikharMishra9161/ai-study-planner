import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../utils/api";

const RANK_STYLES = {
  1: { bg: "bg-amber-400/15",   text: "text-amber-400",   border: "border-amber-400/30",   badge: "🥇" },
  2: { bg: "bg-slate-400/15",   text: "text-slate-400",   border: "border-slate-400/30",   badge: "🥈" },
  3: { bg: "bg-orange-400/15",  text: "text-orange-400",  border: "border-orange-400/30",  badge: "🥉" },
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myXP, setMyXP]               = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lbRes, xpRes] = await Promise.all([
        API.get("/xp/leaderboard"),
        API.get("/xp"),
      ]);
      setLeaderboard(lbRes.data);
      setMyXP(xpRes.data);
    } catch {
      setLeaderboard([]);
      setMyXP(null);
    }
    setLoading(false);
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h2 className="page-title">Leaderboard</h2>
        <p className="page-subtitle">Top students ranked by XP earned</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">

        {/* ── My Stats ────────────────────────────────────────────── */}
        <div className="space-y-4 animate-fade-up-1">
          <h3 className="font-display font-semibold text-white">My Progress</h3>

          {myXP && (
            <>
              {/* Level card */}
              <div className="card p-6 text-center">
                <p className="text-5xl mb-3">{myXP.icon}</p>
                <p className="font-display font-bold text-2xl text-white mb-1">{myXP.title}</p>
                <p className="text-slate-500 text-sm mb-4">Level {myXP.level}</p>

                {/* XP bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{myXP.progressXP} XP</span>
                    <span>{myXP.requiredXP} XP needed</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${myXP.progressPct}%`,
                        background: "linear-gradient(90deg, #22d3ee, #8b5cf6)",
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">{myXP.progressPct}% to {myXP.nextLevel || "Max Level"}</p>

                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="font-display font-bold text-3xl gradient-text">{myXP.totalXP}</p>
                  <p className="text-xs text-slate-500 mt-1">Total XP earned</p>
                </div>
              </div>

              {/* XP history */}
              <div className="card p-5">
                <h4 className="font-display font-semibold text-white mb-4 text-sm">Recent XP</h4>
                {myXP.history?.length === 0 ? (
                  <p className="text-slate-500 text-xs">No XP earned yet. Complete tasks to start!</p>
                ) : (
                  <div className="space-y-2">
                    {myXP.history?.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{h.message.split("+")[0].trim()}</span>
                        <span className="text-cyan-400 font-bold">+{h.points} XP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* XP Guide */}
          <div className="card p-5">
            <h4 className="font-display font-semibold text-white mb-4 text-sm">How to earn XP</h4>
            <div className="space-y-2">
              {[
                { action: "Complete a task",    xp: "+10 XP",  icon: "✓" },
                { action: "Generate AI tasks",  xp: "+15 XP",  icon: "✦" },
                { action: "Summarize notes",    xp: "+20 XP",  icon: "◈" },
                { action: "Attempt a quiz",     xp: "+20 XP",  icon: "?" },
                { action: "Pass a quiz (≥70%)", xp: "+50 XP",  icon: "🏆" },
                { action: "Use AI chat",        xp: "+5 XP",   icon: "💬" },
                { action: "7-day streak",       xp: "+100 XP", icon: "🔥" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-400">
                    <span className="text-slate-600">{item.icon}</span>
                    {item.action}
                  </span>
                  <span className="text-emerald-400 font-bold">{item.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Leaderboard ──────────────────────────────────────────── */}
        <div className="md:col-span-2 animate-fade-up-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white">Top Students</h3>
            <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">
              {leaderboard.length} students
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="card p-12 text-center border-dashed">
              <p className="text-3xl text-slate-700 mb-2">🏆</p>
              <p className="text-slate-500 text-sm">No students on the leaderboard yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((student, i) => {
                const rankStyle = RANK_STYLES[student.rank] || {};
                return (
                  <div
                    key={i}
                    className={`card p-4 flex items-center gap-4 transition-all duration-200 animate-fade-up
                      ${student.isMe ? "border-cyan-500/30 bg-cyan-500/5" : ""}
                    `}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm flex-shrink-0
                      ${rankStyle.bg || "bg-slate-800"} ${rankStyle.border ? `border ${rankStyle.border}` : ""}`}>
                      {rankStyle.badge || (
                        <span className={rankStyle.text || "text-slate-400"}>
                          #{student.rank}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${student.isMe ? "text-cyan-400" : "text-white"}`}>
                          {student.name}
                          {student.isMe && <span className="text-xs text-cyan-400 ml-1">(you)</span>}
                        </p>
                        <span className="text-xs">{student.icon}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Level {student.level} — {student.title}
                      </p>
                    </div>

                    {/* XP */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-display font-bold text-white">{student.totalXP.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}