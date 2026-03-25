import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const user  = localStorage.getItem("user");

  // If no token or user data, redirect to login
  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  return children;
}