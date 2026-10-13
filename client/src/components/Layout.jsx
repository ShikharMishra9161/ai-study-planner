import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

// Rendered once as a parent route, so the navbar (and its XP bar) stays mounted
// while only the page inside <Outlet /> changes.
export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-bg flex flex-col overflow-x-hidden">
      <Navbar />
      <main
        key={pathname}
        className="page-enter flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10"
      >
        <Outlet />
      </main>
    </div>
  );
}
