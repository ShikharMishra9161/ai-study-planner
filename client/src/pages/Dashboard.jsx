import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import Layout from "../components/Layout";
import StreakCard from "../components/StreakCard";
import API from "../utils/api";

// ── Stat Card ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, delay, sub }) {
  return (
    <div className={`card p-5 border-t-2 ${color} animate-fade-up`} style={{ animationDelay: delay }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-slate-600 font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <p className="font-display font-bold text-4xl text-white tracking-tight">{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

// ── Custom Tooltip for charts ──────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1117] border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

const COLORS = ["#22d3ee", "#8b5cf6", "#34d399", "#f59e0b", "#f87171", "#e879f9"];

export default function Dashboard() {
  const [user, setUser]         = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [quizzes, setQuizzes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate                = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [sRes, tRes, qRes] = await Promise.all([
        API.get("/subjects"),
        API.get("/tasks"),
        API.get("/quiz"),
      ]);
      setSubjects(sRes.data);
      setTasks(tRes.data);
      setQuizzes(qRes.data);
    } catch (_) {}
    setLoading(false);
  };

  // ── Computed stats ───────────────────────────────────────────────────
  const done    = tasks.filter((t) => t.status === "done").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const pct     = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const attemptedQuizzes = quizzes.filter((q) => q.attempted);
  const avgQuizScore     = attemptedQuizzes.length
    ? Math.round(attemptedQuizzes.reduce((sum, q) => sum + Math.round((q.score / q.total) * 100), 0) / attemptedQuizzes.length)
    : 0;

  // Per-subject task breakdown for bar chart
  const subjectChartData = subjects.map((s) => {
    const subTasks   = tasks.filter((t) => t.subjectId?._id === s._id || t.subjectId === s._id);
    const subDone    = subTasks.filter((t) => t.status === "done").length;
    const subPending = subTasks.filter((t) => t.status === "pending").length;
    return {
      name:    s.subject.length > 10 ? s.subject.slice(0, 10) + "…" : s.subject,
      Done:    subDone,
      Pending: subPending,
      total:   subTasks.length,
    };
  });

  // Pie chart data for overall task status
  const pieData = [
    { name: "Completed", value: done },
    { name: "Pending",   value: pending },
  ].filter((d) => d.value > 0);

  // Quiz score history for bar chart
  const quizChartData = attemptedQuizzes.slice(-7).map((q, i) => ({
    name:  q.subjectId?.subject?.slice(0, 8) || `Quiz ${i + 1}`,
    Score: Math.round((q.score / q.total) * 100),
  }));

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Layout>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="card p-8 mb-6 relative overflow-hidden animate-fade-up">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)" }} />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-slate-500 text-sm mb-1">{greeting} 👋</p>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight mb-2">
              {user?.name || "Student"}
            </h2>
            <p className="text-slate-500 text-sm">Here's your full study analytics.</p>

            {/* Quick stat pills */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <span className="text-xs bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 px-3 py-1 rounded-full font-medium">
                {subjects.length} Subjects
              </span>
              <span className="text-xs bg-violet-400/10 text-violet-400 border border-violet-400/20 px-3 py-1 rounded-full font-medium">
                {tasks.length} Tasks
              </span>
              <span className="text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-3 py-1 rounded-full font-medium">
                {quizzes.length} Quizzes
              </span>
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative flex items-center justify-center flex-shrink-0">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="url(#grad)" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: "stroke-dashoffset 1.2s ease" }}
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <p className="font-display font-bold text-2xl text-white leading-none">{pct}%</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">done</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Subjects"    value={subjects.length}   icon="◈" color="border-t-cyan-500"    delay="0.05s" />
        <StatCard label="Completed"   value={done}              icon="✓" color="border-t-emerald-500"  delay="0.1s"  sub={`${pct}% completion`} />
        <StatCard label="Pending"     value={pending}           icon="◷" color="border-t-amber-500"   delay="0.15s" />
        <StatCard label="Avg Quiz"    value={attemptedQuizzes.length ? `${avgQuizScore}%` : "—"} icon="◎" color="border-t-violet-500" delay="0.2s" sub={`${attemptedQuizzes.length} attempted`} />
      </div>

      {/* ── Streak ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <StreakCard />
      </div>

      {/* ── Charts Row 1 ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Tasks per subject bar chart */}
        <div className="md:col-span-2 card p-6 animate-fade-up-2">
          <h3 className="font-display font-semibold text-white mb-1">Tasks by Subject</h3>
          <p className="text-xs text-slate-500 mb-5">Completed vs pending per subject</p>
          {loading ? (
            <div className="skeleton h-48 w-full" />
          ) : subjectChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              No subjects yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectChartData} barSize={18} barGap={4}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="Done"    fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-cyan-400 inline-block" /> Done
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Pending
            </span>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card p-6 animate-fade-up-2">
          <h3 className="font-display font-semibold text-white mb-1">Task Status</h3>
          <p className="text-xs text-slate-500 mb-4">Overall breakdown</p>
          {loading ? (
            <div className="skeleton h-48 w-full rounded-full" />
          ) : pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              No tasks yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? "#22d3ee" : "#f59e0b"}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-1">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Completed
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Pending
            </span>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2 ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Quiz score history */}
        <div className="md:col-span-2 card p-6 animate-fade-up-3">
          <h3 className="font-display font-semibold text-white mb-1">Quiz Score History</h3>
          <p className="text-xs text-slate-500 mb-5">Last 7 quiz scores (%)</p>
          {loading ? (
            <div className="skeleton h-48 w-full" />
          ) : quizChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              No quizzes attempted yet —{" "}
              <Link to="/quiz" className="text-cyan-400 ml-1 hover:underline">Take one!</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={quizChartData} barSize={22}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="Score" radius={[4, 4, 0, 0]}>
                  {quizChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.Score >= 80 ? "#34d399" : entry.Score >= 50 ? "#f59e0b" : "#f87171"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Per-subject progress */}
        <div className="card p-6 animate-fade-up-3">
          <h3 className="font-display font-semibold text-white mb-1">Subject Progress</h3>
          <p className="text-xs text-slate-500 mb-5">Completion % per subject</p>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-8 w-full" />)}
            </div>
          ) : subjectChartData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
              No subjects yet
            </div>
          ) : (
            <div className="space-y-4">
              {subjectChartData.map((s, i) => {
                const pct = s.total ? Math.round((s.Done / s.total) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-slate-300 font-medium truncate">{s.name}</span>
                      <span className="text-xs font-bold ml-2 flex-shrink-0"
                        style={{ color: COLORS[i % COLORS.length] }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${pct}%`,
                          background: COLORS[i % COLORS.length],
                          transitionDelay: `${i * 0.1}s`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row ────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* Recent tasks */}
        <div className="md:col-span-2 card p-6 animate-fade-up-4">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-semibold text-white">Recent Tasks</h3>
            <Link to="/tasks" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-11 w-full" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm mb-3">No tasks yet</p>
              <Link to="/subjects" className="text-xs text-cyan-400 border border-cyan-400/30 px-4 py-2 rounded-lg hover:bg-cyan-400/8 transition-colors">
                Add a subject first
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 5).map((t) => (
                <div key={t._id} className="flex items-center gap-3 p-3 bg-[#060910] rounded-xl">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === "done" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className={`flex-1 text-sm truncate ${t.status === "done" ? "line-through text-slate-600" : "text-slate-300"}`}>
                    {t.task}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0
                    ${t.status === "done" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-3 animate-fade-up-4">
          <h3 className="font-display font-semibold text-white">Quick Actions</h3>
          {[
            { to: "/subjects", icon: "◈", label: "Manage Subjects", sub: "Add chapters & topics",     color: "hover:border-cyan-500/40",   iconBg: "bg-cyan-400/10 text-cyan-400"    },
            { to: "/tasks",    icon: "◎", label: "AI Tasks",        sub: "Generate study tasks",      color: "hover:border-violet-500/40", iconBg: "bg-violet-400/10 text-violet-400" },
            { to: "/quiz",     icon: "?", label: "Take a Quiz",      sub: "Test your knowledge",       color: "hover:border-emerald-500/40",iconBg: "bg-emerald-400/10 text-emerald-400"},
            { to: "/chat",     icon: "✦", label: "AI Chat",         sub: "Ask your study assistant",  color: "hover:border-amber-500/40",  iconBg: "bg-amber-400/10 text-amber-400"  },
          ].map(({ to, icon, label, sub, color, iconBg }) => (
            <Link key={to} to={to}
              className={`card p-4 flex items-center gap-3 ${color} transition-all duration-200 group block no-underline`}>
              <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center text-base flex-shrink-0`}>
                {icon}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </Layout>
  );
}