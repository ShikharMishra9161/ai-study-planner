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
    const handleStorage = () =>
      setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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
    <>
      <nav className="sticky top-0 z-50 bg-[#0d1117]/90 backdrop-blur-xl border-b border-slate-800/60">
        <div className="h-16 px-4 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 no-underline flex-shrink-0"
          >
            <span className="text-2xl text-cyan-400 leading-none">⬡</span>
            <span className="font-display font-bold text-lg text-white tracking-tight">
              Study<span className="gradient-text">AI</span>
            </span>
          </Link>

          {/* Desktop links */}
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
                        ? "text-cyan-400 bg-cyan-400/8"
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

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* XPBar — desktop only */}
            <div className="hidden md:block">
              <XPBar />
            </div>

            {/* Avatar + dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-bold text-gray-950 font-display hover:opacity-90 transition-opacity"
              >
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-10 z-20 w-48 card border border-slate-700 shadow-xl py-1 animate-fade-up">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-white text-sm font-semibold truncate">
                        {user?.name}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        {user?.email}
                      </p>
                    </div>
                    {/* XPBar in dropdown on mobile */}
                    <div className="px-4 py-2 border-b border-slate-800 md:hidden">
                      <XPBar />
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors no-underline"
                    >
                      ✎ Edit Profile
                    </Link>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:bg-rose-400/10 transition-colors"
                    >
                      → Sign out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Hamburger — mobile only */}
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

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800/60 bg-[#0d1117] animate-fade-up">
            <div className="px-4 py-3 grid grid-cols-2 gap-1">
              {NAV_LINKS.map(({ to, label, icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline
                      ${
                        active
                          ? "text-cyan-400 bg-cyan-400/10"
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
    </>
  );
}
