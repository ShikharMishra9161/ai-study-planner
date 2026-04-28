import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
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
import "./index.css";

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0d1117",
            color: "#e2e8f0",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            fontSize: "0.875rem",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          },
          success: { iconTheme: { primary: "#34d399", secondary: "#0d1117" } },
          error:   { iconTheme: { primary: "#f87171", secondary: "#0d1117" } },
        }}
      />
      <Routes>
        <Route path="/"       element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/subjects"     element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
        <Route path="/tasks"        element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/quiz"         element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
        <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
        <Route path="/leaderboard"  element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/games"        element={<ProtectedRoute><Games /></ProtectedRoute>} />
        <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;