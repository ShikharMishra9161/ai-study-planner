import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, CheckSquare, Trophy, Clock,
  ChevronRight, Sparkles, HelpCircle, Gamepad2,
  MessageCircle, TrendingUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import Layout from "../components/Layout";
import StreakCard from "../components/StreakCard";
import API from "../utils/api";

function StatCard({ label, value, icon: Icon, color, iconColor, delay }) {
  return (
    <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-5 animate-fade-up" style={{ animationDelay: delay }}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={15} className={iconColor} />
        </div>
        <span className="text-xs text-slate-600 font-medium">{label}</span>
      </div>
      <p className="font-display font-bold text-3xl text-white tracking-tight">{value}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1117] border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

const COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#f87171", "#e879f9"];

export default function Dashboard() {
  const [user, setUser]         = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [quizzes, setQuizzes]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    fetchData();
  }, []);

  const fetchData = async () => {
    const [sRes, tRes, qRes] = await Promise.allSettled([
      API.get("/subjects"),
      API.get("/tasks"),
      API.get("/quiz"),
    ]);
    if (sRes.status === "fulfilled") setSubjects(sRes.value.data);
    if (tRes.status === "fulfilled") setTasks(tRes.value.data);
    if (qRes.status === "fulfilled") setQuizzes(qRes.value.data);
    setLoading(false);
  };

  const done    = tasks.filter(t => t.status === "done").length;
  const pending = tasks.filter(t => t.status === "pending").length;
  const pct     = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const attemptedQuizzes = quizzes.filter(q => q.attempted);
  const avgQuiz = attemptedQuizzes.length
    ? Math.round(attemptedQuizzes.reduce((s, q) => s + Math.round((q.score / q.total) * 100), 0) / attemptedQuizzes.length)
    : 0;

  const subjectChartData = subjects.map(s => {
    const sub  = tasks.filter(t => t.subjectId?._id === s._id || t.subjectId === s._id);
    const Done = sub.filter(t => t.status === "done").length;
    return { name: s.subject.slice(0, 8), Done, Pending: sub.filter(t => t.status === "pending").length };
  });

  const pieData = [
    { name: "Done",    value: done    },
    { name: "Pending", value: pending },
  ].filter(d => d.value > 0);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-[#0d1117] border border-slate-800/60 rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden animate-fade-up">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <p className="text-slate-500 text-sm mb-1">{greeting} 👋</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight mb-2">
              {user?.name || "Student"}
            </h2>
            <p className="text-slate-500 text-sm">Here's your study overview.</p>
          </div>

          {/* Progress ring */}
          <div className="relative flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke="#06b6d4" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-bold text-lg text-white leading-none">{pct}%</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wide">done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Subjects"  value={subjects.length} icon={BookOpen}    color="bg-cyan-500/10"   iconColor="text-cyan-400"   delay="0.05s" />
        <StatCard label="Completed" value={done}             icon={CheckSquare} color="bg-emerald-500/10" iconColor="text-emerald-400" delay="0.1s"  />
        <StatCard label="Pending"   value={pending}          icon={Clock}       color="bg-amber-500/10"  iconColor="text-amber-400"   delay="0.15s" />
        <StatCard label="Avg Quiz"  value={avgQuiz ? `${avgQuiz}%` : "—"} icon={Trophy} color="bg-violet-500/10" iconColor="text-violet-400" delay="0.2s" />
      </div>

      {/* Streak */}
      <div className="mb-6">
        <StreakCard />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Bar chart */}
        <div className="md:col-span-2 bg-[#0d1117] border border-slate-800/60 rounded-xl p-5 animate-fade-up-2">
          <p className="font-display font-semibold text-white text-sm mb-1">Tasks by Subject</p>
          <p className="text-xs text-slate-500 mb-4">Completed vs pending</p>
          {loading ? (
            <div className="skeleton h-44 w-full" />
          ) : subjectChartData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-slate-600 text-sm">No subjects yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={subjectChartData} barSize={14} barGap={3}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="Done"    fill="#06b6d4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" /> Done</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Pending</span>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-[#0d1117] border border-slate-800/60 rounded-xl p-5 animate-fade-up-2">
          <p className="font-display font-semibold text-white text-sm mb-1">Task Status</p>
          <p className="text-xs text-slate-500 mb-4">Overall breakdown</p>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-slate-600 text-sm">No tasks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#06b6d4" : "#f59e0b"} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-1">
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Done</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Pending</span>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Recent tasks */}
        <div className="md:col-span-2 bg-[#0d1117] border border-slate-800/60 rounded-xl p-5 animate-fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-semibold text-white text-sm">Recent Tasks</p>
            <Link to="/tasks" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 no-underline">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full" />)}</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare size={24} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No tasks yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 5).map(t => (
                <div key={t._id} className="flex items-center gap-3 p-2.5 bg-[#060910] rounded-lg">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === "done" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className={`flex-1 text-sm break-words min-w-0 ${t.status === "done" ? "line-through text-slate-600" : "text-slate-300"}`}>
                    {t.task}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0
                    ${t.status === "done" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-2 animate-fade-up-4">
          <p className="font-display font-semibold text-white text-sm mb-3">Quick Actions</p>
          {[
            { to: "/subjects",     icon: BookOpen,       label: "Manage Subjects", sub: "Add chapters",        color: "text-cyan-400"   },
            { to: "/tasks",        icon: CheckSquare,    label: "AI Tasks",        sub: "Generate tasks",      color: "text-violet-400" },
            { to: "/quiz",         icon: HelpCircle,     label: "Take a Quiz",     sub: "Test knowledge",      color: "text-emerald-400"},
            { to: "/ai-assistant", icon: MessageCircle,  label: "AI Chat",         sub: "Ask anything",        color: "text-amber-400"  },
            { to: "/games",        icon: Gamepad2,       label: "Games",           sub: "Earn XP",             color: "text-rose-400"   },
            { to: "/leaderboard",  icon: TrendingUp,     label: "Leaderboard",     sub: "Check your rank",     color: "text-sky-400"    },
          ].map(({ to, icon: Icon, label, sub, color }) => (
            <Link key={to} to={to}
              className="flex items-center gap-3 p-3 bg-[#0d1117] border border-slate-800/60 rounded-lg hover:border-slate-700 transition-colors no-underline group">
              <Icon size={16} className={`${color} flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold">{label}</p>
                <p className="text-slate-500 text-xs">{sub}</p>
              </div>
              <ChevronRight size={12} className="text-slate-700 group-hover:text-slate-500 ml-auto flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}