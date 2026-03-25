import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";

export default function XPBar() {
  const [xp, setXp] = useState(null);

  useEffect(() => {
    fetchXP();
    // Refresh XP every 30 seconds
    const interval = setInterval(fetchXP, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchXP = async () => {
    try {
      const res = await API.get("/xp");
      setXp(res.data);
    } catch {
      setXp(null);
    }
  };

  if (!xp) return null;

  return (
    <Link to="/leaderboard" className="hidden md:flex items-center gap-2 no-underline group">
      {/* Level badge */}
      <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl px-2.5 py-1.5 group-hover:border-slate-600 transition-colors">
        <span className="text-sm">{xp.icon}</span>
        <div>
          <p className="text-[10px] text-slate-500 leading-none font-medium uppercase tracking-wider">
            Lv.{xp.level} {xp.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {/* XP progress bar */}
            <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${xp.progressPct}%`,
                  background: "linear-gradient(90deg, #22d3ee, #8b5cf6)",
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              {xp.totalXP} XP
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}