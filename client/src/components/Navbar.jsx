import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import XPBar from "./XPBar";

const NAV_LINKS = [
  { to: "/dashboard",    label: "Dashboard", icon: "⬡" },
  { to: "/subjects",     label: "Subjects",  icon: "◈" },
  { to: "/tasks",        label: "Tasks",     icon: "◎" },
  { to: "/quiz",         label: "Quiz",      icon: "?" },
  { to: "/ai-assistant", label: "AI",        icon: "✦" },
  { to: "/games",        label: "Games",     icon: "🎮" },
  { to: "/leaderboard",  label: "Ranks",     icon: "🏆" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 h-16 px-4 flex items-center justify-between bg-[#0d1117]/80 backdrop-blur-xl border-b border-slate-800/60 gap-3">

      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 no-underline flex-shrink-0">
        <span className="text-2xl text-cyan-400 leading-none">⬡</span>
        <span className="font-display font-bold text-lg text-white tracking-tight">
          Study<span className="gradient-text">AI</span>
        </span>
      </Link>

      {/* Links — always show labels */}
      <div className="flex items-center gap-0.5">
        {NAV_LINKS.map(({ to, label, icon }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                transition-all duration-200 no-underline flex-shrink-0
                ${active
                  ? "text-cyan-400 bg-cyan-400/8"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                }`}>
              <span className="text-sm">{icon}</span>
              <span>{label}</span>
              {active && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <XPBar />
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-bold text-gray-950 font-display">
          {user?.name ? user.name[0].toUpperCase() : "U"}
        </div>
        <button onClick={logout} className="btn-ghost text-xs px-3 py-1.5 rounded-lg">
          Sign out
        </button>
      </div>

    </nav>
  );
}