import { useState } from "react";
import { Moon, Sun } from "lucide-react";

// The initial class is set by the inline script in index.html, so we just read it here.
export default function ThemeToggle({ className = "" }) {
  const [light, setLight] = useState(() =>
    document.documentElement.classList.contains("light")
  );

  const toggle = () => {
    const next = !light;
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      // Storage can be blocked (private mode); the toggle still works for this visit.
    }
    setLight(next);
  };

  return (
    <button
      onClick={toggle}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors ${className}`}
    >
      {light ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
