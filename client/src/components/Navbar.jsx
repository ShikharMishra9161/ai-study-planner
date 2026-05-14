import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import XPBar from "./XPBar";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "⬡" },
  { to: "/subjects", label: "Subjects", icon: "◈" },
  { to: "/tasks", label: "Tasks", icon: "◎" },
  { to: "/quiz", label: "Quiz", icon: "?" },
  { to: "/ai-assistant", label: "AI", icon: "✦" },
  { to: "/games", label: "Games", icon: "🎮" },
  { to: "/leaderboard", label: "Ranks", icon: "🏆" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}")
  );

  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    toast.success("Signed out successfully");

    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-xl border-b border-slate-800/60 shadow-lg shadow-cyan-500/5">
      <div className="h-16 px-4 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link
          to="/dashboard"
          className="flex items-center gap-3 no-underline flex-shrink-0"
        >
          <img
            src="/logo.png"
            alt="StudyAI Logo"
            className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-cyan-500/20"
          />

          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-lg text-white tracking-tight">
              Study<span className="text-cyan-400">AI</span>
            </span>

            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Smart Learning
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label, icon }) => {
            const active = location.pathname === to;

            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                transition-all duration-200 no-underline flex-shrink-0
                ${
                  active
                    ? "text-cyan-400 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/10"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                <span className="text-sm">{icon}</span>

                <span className="hidden lg:block">{label}</span>

                {active && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* XP Bar Desktop */}
          <div className="hidden md:block">
            <XPBar />
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-sm font-bold text-gray-950 font-display hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
            >
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />

                <div className="absolute right-0 top-11 z-20 w-52 card border border-slate-700 shadow-2xl py-1 animate-fade-up rounded-2xl overflow-hidden bg-[#111827]">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-white text-sm font-semibold truncate">
                      {user?.name}
                    </p>

                    <p className="text-slate-500 text-xs truncate">
                      {user?.email}
                    </p>
                  </div>

                  {/* XP Bar Mobile */}
                  <div className="px-4 py-3 border-b border-slate-800 md:hidden">
                    <XPBar />
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors no-underline"
                  >
                    ✎ Edit Profile
                  </Link>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      logout();
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm text-rose-400 hover:bg-rose-400/10 transition-colors"
                  >
                    → Sign out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <span
              className={`block w-5 h-0.5 bg-slate-400 transition-all duration-300 ${
                mobileOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />

            <span
              className={`block w-5 h-0.5 bg-slate-400 transition-all duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />

            <span
              className={`block w-5 h-0.5 bg-slate-400 transition-all duration-300 ${
                mobileOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800/60 bg-[#0d1117] animate-fade-up transition-all duration-300">
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {NAV_LINKS.map(({ to, label, icon }) => {
              const active = location.pathname === to;

              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-colors no-underline
                  ${
                    active
                      ? "text-cyan-400 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/10"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <span>{icon}</span>

                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}