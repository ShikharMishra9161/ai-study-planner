import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import API from "../utils/api";

export default function XPBar() {
  const [xp, setXp] = useState(null);

  useEffect(() => {
    fetchXP();
    const interval = setInterval(fetchXP, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchXP = async () => {
    try {
      const res = await API.get("/xp");
      setXp(res.data);
    } catch (_) {}
  };

  if (!xp) return null;

  return (
    <Link to="/leaderboard" className="hidden md:flex items-center gap-2 no-underline group">
      <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 hover:border-slate-600 transition-colors">
        <span className="text-sm">{xp.icon}</span>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Lv.{xp.level}</span>
            <div className="w-14 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${xp.progressPct}%` }}
              />
            </div>
            <div className="flex items-center gap-0.5">
              <Zap size={9} className="text-amber-400" />
              <span className="text-[10px] text-slate-400 font-medium">{xp.totalXP}</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 mt-0.5">{xp.title}</p>
        </div>
      </div>
    </Link>
  );
}