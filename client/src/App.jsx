import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout       from "./components/Layout";
import Login        from "./pages/Login";
import Signup       from "./pages/Signup";
import Dashboard    from "./pages/Dashboard";
import Subjects     from "./pages/Subjects";
import Tasks        from "./pages/Tasks";
import Quiz         from "./pages/Quiz";
import AIAssistant  from "./pages/AIAssistant";
import Leaderboard  from "./pages/Leaderboard";
import Games        from "./pages/Games";
import Profile      from "./pages/Profile";

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            color: "var(--color-slate-200)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            fontSize: "0.875rem",
            fontFamily: "'Inter', sans-serif",
          },
          success: { iconTheme: { primary: "#34d399", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#f87171", secondary: "#fff" } },
        }}
      />
      <Routes>
        <Route path="/"       element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/subjects"     element={<Subjects />} />
          <Route path="/tasks"        element={<Tasks />} />
          <Route path="/quiz"         element={<Quiz />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/leaderboard"  element={<Leaderboard />} />
          <Route path="/games"        element={<Games />} />
          <Route path="/profile"      element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;