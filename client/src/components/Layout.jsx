import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout({ children }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-[#060910] flex flex-col overflow-x-hidden">
      <Navbar />
      <main
        key={location.pathname}
        className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 overflow-x-hidden"
      >
        {children}
      </main>
    </div>
  );
}