import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import API from "../utils/api";

const ACCENTS = [
  { border: "border-t-cyan-400",    text: "text-cyan-400",    bg: "bg-cyan-400/10",    tag: "bg-cyan-400/8 text-cyan-400 border-cyan-400/20"       },
  { border: "border-t-violet-400",  text: "text-violet-400",  bg: "bg-violet-400/10",  tag: "bg-violet-400/8 text-violet-400 border-violet-400/20"   },
  { border: "border-t-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/10", tag: "bg-emerald-400/8 text-emerald-400 border-emerald-400/20" },
  { border: "border-t-amber-400",   text: "text-amber-400",   bg: "bg-amber-400/10",   tag: "bg-amber-400/8 text-amber-400 border-amber-400/20"       },
  { border: "border-t-rose-400",    text: "text-rose-400",    bg: "bg-rose-400/10",    tag: "bg-rose-400/8 text-rose-400 border-rose-400/20"          },
  { border: "border-t-fuchsia-400", text: "text-fuchsia-400", bg: "bg-fuchsia-400/10", tag: "bg-fuchsia-400/8 text-fuchsia-400 border-fuchsia-400/20" },
];

export default function Subjects() {
  const [subject, setSubject]   = useState("");
  const [chapters, setChapters] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // track which is being deleted

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await API.get("/subjects");
      setSubjects(res.data);
    } catch { toast.error("Failed to load subjects"); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!subject.trim() || !chapters.trim()) {
      toast.error("Please fill in both fields");
      return;
    }
    setCreating(true);
    try {
      await API.post("/subjects", {
        subject: subject.trim(),
        chapters: chapters.split(",").map((c) => c.trim()).filter(Boolean),
      });
      toast.success("Subject created!");
      setSubject("");
      setChapters("");
      fetchSubjects();
    } catch {
      toast.error("Error creating subject");
    }
    setCreating(false);
  };

  const handleDelete = async (id, name) => {
    // Confirm before deleting
    if (!window.confirm(`Delete "${name}"? This will also delete all tasks for this subject.`)) return;

    setDeletingId(id);
    try {
      await API.delete(`/subjects/${id}`);
      setSubjects((prev) => prev.filter((s) => s._id !== id));
      toast.success(`"${name}" deleted`);
    } catch {
      toast.error("Error deleting subject");
    }
    setDeletingId(null);
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h2 className="page-title">Subjects</h2>
        <p className="page-subtitle">Organise your subjects and chapters for AI task generation</p>
      </div>

      {/* Create form */}
      <div className="card p-6 mb-8 animate-fade-up-1">
        <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
          <span className="gradient-text">+</span> Add New Subject
        </h3>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="label">Subject Name</label>
            <input
              type="text"
              placeholder="e.g. Mathematics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="space-y-2">
            <label className="label">
              Chapters{" "}
              <span className="normal-case font-normal text-slate-600">(comma-separated)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Algebra, Calculus, Geometry"
              value={chapters}
              onChange={(e) => setChapters(e.target.value)}
              className="input-field"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
        </div>
        <button onClick={handleCreate} className="btn-primary" disabled={creating}>
          {creating ? <span className="spinner" /> : <span>+</span>}
          {creating ? "Creating…" : "Create Subject"}
        </button>
      </div>

      {/* Subjects grid header */}
      <div className="flex items-center justify-between mb-4 animate-fade-up-2">
        <h3 className="font-display font-semibold text-white">Your Subjects</h3>
        <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">
          {subjects.length} total
        </span>
      </div>

      {/* Subjects grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="card p-12 text-center border-dashed animate-fade-up-2">
          <p className="text-3xl text-slate-700 mb-2">◈</p>
          <p className="text-slate-500 text-sm">No subjects yet. Add one above to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const isDeleting = deletingId === s._id;

            return (
              <div
                key={s._id}
                className={`card p-5 border-t-2 ${accent.border} transition-all duration-200 animate-fade-up group
                  ${isDeleting ? "opacity-50 scale-95" : "hover:border-opacity-80"}
                `}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Card header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg ${accent.bg} flex items-center justify-center ${accent.text} text-sm font-bold font-display flex-shrink-0`}>
                    {s.subject[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-semibold text-white truncate">{s.subject}</h4>
                    <p className="text-xs text-slate-500">{s.chapters.length} chapters</p>
                  </div>

                  {/* Delete button — visible on hover */}
                  <button
                    onClick={() => handleDelete(s._id, s.subject)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-7 h-7 rounded-lg bg-rose-400/10 text-rose-400 hover:bg-rose-400/20 flex items-center justify-center text-xs flex-shrink-0"
                    title="Delete subject"
                  >
                    {isDeleting ? (
                      <span className="w-3 h-3 border border-rose-400/30 border-t-rose-400 rounded-full animate-spin inline-block" />
                    ) : "✕"}
                  </button>
                </div>

                {/* Chapter tags */}
                <div className="flex flex-wrap gap-1.5">
                  {s.chapters.map((ch, j) => (
                    <span
                      key={j}
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${accent.tag} font-medium`}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}