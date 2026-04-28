import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import API from "../utils/api";

export default function Tasks() {
  const [subjects, setSubjects]               = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [tasks, setTasks]                     = useState([]);
  const [generating, setGenerating]           = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [filter, setFilter]                   = useState("all");
  const [lastMeta, setLastMeta]               = useState(null);
  const navigate                              = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    Promise.all([fetchSubjects(), fetchTasks()]);
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await API.get("/subjects");
      setSubjects(res.data);
    } catch (_) {}
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await API.get("/tasks");
      setTasks(res.data);
    } catch (_) { toast.error("Failed to load tasks"); }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!selectedSubject) { toast.error("Please select a subject first"); return; }
    setGenerating(true);
    const toastId = toast.loading("AI is analysing your progress…");
    try {
      // ✅ Response now has { tasks, meta }
      const res = await API.post("/tasks/generate", { subjectId: selectedSubject });
      const { meta } = res.data;

      setLastMeta(meta);
      await fetchTasks();

      toast.success(
        `${meta.totalGenerated} ${meta.difficulty} tasks generated for ${meta.subject}! ✦`,
        { id: toastId, duration: 4000 }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Error generating tasks", { id: toastId });
    }
    setGenerating(false);
  };

  const toggleStatus = async (id, status) => {
    try {
      const res = await API.put(`/tasks/${id}`, { status: status === "pending" ? "done" : "pending" });
      setTasks((prev) =>
        prev.map((t) => t._id === id
          ? { ...t, status: status === "pending" ? "done" : "pending" }
          : t
        )
      );
      if (status === "pending") { const xp = res.data?.xp; toast.success(xp ? `Task completed! +${xp.pointsEarned} XP 🎉` : "Task completed! 🎉", { duration: 3000 }); } else { toast.success("Marked as pending"); }
    } catch (_) { toast.error("Failed to update task"); }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      toast.success("Task deleted");
    } catch (_) { toast.error("Failed to delete task"); }
  };

  const done    = tasks.filter((t) => t.status === "done").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const pct     = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const filtered = tasks.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  // Difficulty badge color
  const difficultyColor = {
    "beginner-friendly since this is their first time": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    "simple and beginner-friendly":                     "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    "intermediate":                                     "text-amber-400 bg-amber-400/10 border-amber-400/20",
    "advanced and challenging":                         "text-rose-400 bg-rose-400/10 border-rose-400/20",
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h2 className="page-title">Tasks</h2>
        <p className="page-subtitle">AI-generated study tasks personalised to your progress</p>
      </div>

      {/* Generate bar */}
      <div className="card p-5 mb-4 animate-fade-up-1">
        <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <span className="gradient-text">✦</span> Generate AI Tasks
        </h3>
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="input-field flex-1 min-w-0"
          >
            <option value="">Select a subject…</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.subject}</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={!selectedSubject || generating}
            className="btn-primary whitespace-nowrap"
          >
            {generating ? <span className="spinner" /> : <span>✦</span>}
            {generating ? "Analysing & Generating…" : "Generate with AI"}
          </button>
        </div>
      </div>

      {/* ── AI Insight Banner (shows after generation) ── */}
      {lastMeta && (
        <div className="card p-4 mb-6 border-cyan-500/20 animate-fade-up">
          <div className="flex items-start gap-3">
            <span className="text-cyan-400 text-lg mt-0.5">✦</span>
            <div className="flex-1">
              <p className="text-sm text-white font-semibold mb-1">
                AI Insight for <span className="gradient-text">{lastMeta.subject}</span>
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Based on your{" "}
                <span className="text-white font-medium">{lastMeta.subjectCompletionRate}% completion rate</span>
                {" "}on this subject and{" "}
                <span className="text-white font-medium">{lastMeta.overallCompletionRate}% overall progress</span>,
                the AI generated tasks at{" "}
                <span className={`font-semibold px-1.5 py-0.5 rounded border text-xs ${difficultyColor[lastMeta.difficulty] || "text-cyan-400 bg-cyan-400/10 border-cyan-400/20"}`}>
                  {lastMeta.difficulty}
                </span>
                {" "}level, skipping tasks you've already completed.
              </p>
            </div>
            <button
              onClick={() => setLastMeta(null)}
              className="text-slate-600 hover:text-slate-400 text-sm transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="card p-5 mb-6 animate-fade-up-2">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-slate-400 font-medium">
              {done} of {tasks.length} tasks complete
            </p>
            <p className="text-sm font-bold gradient-text">{pct}%</p>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #22d3ee, #8b5cf6)",
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-xs text-slate-600">{pending} pending</p>
            <p className="text-xs text-slate-600">{done} completed</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5 animate-fade-up-2">
        {[
          { key: "all",     label: "All",     count: tasks.length },
          { key: "pending", label: "Pending", count: pending },
          { key: "done",    label: "Done",    count: done },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
              ${filter === key
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-300"
              }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
              ${filter === key ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-500"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center border-dashed">
          <p className="text-3xl text-slate-700 mb-2">✦</p>
          <p className="font-display font-semibold text-white mb-1">No tasks yet</p>
          <p className="text-slate-500 text-sm">
            Select a subject above and generate AI tasks to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => (
            <div
              key={t._id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group animate-fade-up
                ${t.status === "done"
                  ? "bg-[#060910] border-slate-800/40"
                  : "bg-[#0d1117] border-slate-800/60 hover:border-slate-700"
                }`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleStatus(t._id, t.status)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
                  ${t.status === "done"
                    ? "bg-emerald-400 border-emerald-400"
                    : "border-slate-600 hover:border-cyan-400"
                  }`}
              >
                {t.status === "done" && (
                  <span className="text-gray-950 text-xs font-bold">✓</span>
                )}
              </button>

              {/* Task text */}
              <span className={`flex-1 text-sm leading-relaxed transition-all duration-200
                ${t.status === "done" ? "line-through text-slate-600" : "text-slate-300"}`}>
                {t.task}
              </span>

              {/* Subject badge */}
              {t.subjectId?.subject && (
                <span className="hidden sm:block text-xs text-slate-600 bg-slate-800/60 px-2 py-0.5 rounded-lg flex-shrink-0">
                  {t.subjectId.subject}
                </span>
              )}

              {/* Status badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:block flex-shrink-0
                ${t.status === "done"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-amber-400/10 text-amber-400"
                }`}>
                {t.status}
              </span>

              {/* Delete */}
              <button
                onClick={() => handleDelete(t._id)}
                className="text-slate-700 hover:text-rose-400 transition-colors text-sm opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}