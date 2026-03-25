import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../utils/api";

export default function Signup() {
  const [form, setForm]       = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("/auth/register", form);
      toast.success("Account created! Please sign in.");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error signing up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060910] flex items-center justify-center px-4 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-gradient-radial from-violet-500/6 to-transparent pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-gradient-radial from-emerald-500/6 to-transparent pointer-events-none" />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <div className="card w-full max-w-md p-8 relative z-10 animate-fade-up glow-violet">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl text-violet-400 mb-4">⬡</div>
          <h1 className="font-display font-bold text-3xl text-white tracking-tight mb-2">
            Create account
          </h1>
          <p className="text-slate-500 text-sm">
            Start your AI-powered study journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="label">Full Name</label>
            <input
              type="text"
              placeholder="Alex Johnson"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="label">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="label">Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-gradient-to-r from-violet-500 to-cyan-400 text-gray-950 font-bold px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? "Creating account…" : "Create account →"}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-500 text-sm">
          Already have an account?{" "}
          <Link to="/" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}