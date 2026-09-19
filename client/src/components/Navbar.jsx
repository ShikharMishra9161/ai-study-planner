import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, BookOpen, CheckSquare, HelpCircle,
  Sparkles, Gamepad2, Trophy, Menu, X, User, LogOut
} from "lucide-react";
import toast from "react-hot-toast";
import XPBar from "./XPBar";

const NAV_LINKS = [
  { to: "/dashboard",    label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects",     label: "Subjects",  icon: BookOpen        },
  { to: "/tasks",        label: "Tasks",     icon: CheckSquare     },
  { to: "/quiz",         label: "Quiz",      icon: HelpCircle      },
  { to: "/ai-assistant", label: "AI",        icon: Sparkles        },
  { to: "/games",        label: "Games",     icon: Gamepad2        },
  { to: "/leaderboard",  label: "Ranks",     icon: Trophy          },
];

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user, setUser]             = useState(JSON.parse(localStorage.getItem("user") || "{}"));
  const [showMenu, setShowMenu]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleStorage = () => setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0d1117]/90 backdrop-blur-xl border-b border-slate-800/50">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 no-underline flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-base text-white tracking-tight">
            StudyAI
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors duration-150 no-underline
                  ${active
                    ? "text-cyan-400 bg-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}>
                <Icon size={15} />
                <span className="hidden lg:block">{label}</span>
                {active && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:block">
            <XPBar />
          </div>

          {/* Avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-semibold text-white hover:bg-slate-600 transition-colors"
            >
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 z-20 w-52 bg-[#0d1117] border border-slate-800 rounded-xl shadow-xl py-1.5 animate-fade-up">
                  <div className="px-4 py-2.5 border-b border-slate-800">
                    <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                    <p className="text-slate-500 text-xs truncate mt-0.5">{user?.email}</p>
                  </div>
                  <div className="px-3 py-2 border-b border-slate-800 md:hidden">
                    <XPBar />
                  </div>
                  <Link to="/profile" onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors no-underline">
                    <User size={14} />
                    Edit Profile
                  </Link>
                  <button onClick={() => { setShowMenu(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800/50 bg-[#0d1117] animate-fade-up">
          <div className="px-4 py-3 grid grid-cols-2 gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline
                    ${active ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}>
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}