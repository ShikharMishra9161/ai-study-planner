import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import API from "../utils/api";

const TABS = [
  { key: "chat",    label: "AI Chat",    icon: "💬", desc: "Chat with your proactive AI agent" },
  { key: "pdf",     label: "Ask PDF",    icon: "📄", desc: "Upload PDF and ask questions"       },
  { key: "summary", label: "Summarize",  icon: "✦",  desc: "Paste notes → summary + flashcards" },
];

// ─────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1.5 px-4 py-3">
      {[0,1,2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block"
          style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TAB 1: AI CHAT (proactive agent)
// ─────────────────────────────────────────────────────────────────────
const CHAT_SUGGESTIONS = [
  "What should I study today?",
  "Help me study my weakest subject",
  "How is my overall progress?",
  "Create a study plan for me",
  "What's my study streak?",
];

const TOOL_LABELS = {
  get_student_progress: "Checking progress",
  get_subjects:         "Reading subjects",
  get_pending_tasks:    "Fetching tasks",
  get_quiz_scores:      "Analysing scores",
  get_weak_subjects:    "Finding weak areas",
  get_study_streak:     "Checking streak",
  create_study_plan:    "Creating study plan",
  mark_tasks_complete:  "Marking tasks done",
  create_reminder:      "Setting reminder",
  clear_completed_tasks:"Clearing tasks",
};

const ACTION_TOOLS = new Set([
  "create_study_plan","mark_tasks_complete",
  "create_reminder","clear_completed_tasks",
]);

const ACTION_LABELS = {
  create_study_plan:    { icon: "✦", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",     label: "Tasks Created"    },
  mark_tasks_complete:  { icon: "✓", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", label: "Tasks Done"  },
  create_reminder:      { icon: "◷", color: "text-violet-400 bg-violet-400/10 border-violet-400/20", label: "Reminder Set" },
  clear_completed_tasks:{ icon: "✕", color: "text-amber-400 bg-amber-400/10 border-amber-400/20",   label: "Tasks Cleared" },
};

function ChatTab() {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const user      = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const res = await API.post("/chat", { message: msg, history });
      const { reply, toolsUsed = [], actionsLog = [] } = res.data;
      setMessages(prev => [...prev, { role: "model", text: reply, toolsUsed, actionsLog }]);
      actionsLog.forEach(a => {
        if (a.tool === "create_study_plan")     toast.success(`${a.result.tasksCreated} tasks created!`);
        if (a.tool === "mark_tasks_complete")   toast.success(`${a.result.markedDone} tasks marked done!`);
        if (a.tool === "clear_completed_tasks") toast.success(`${a.result.deleted} tasks cleared!`);
      });
    } catch {
      toast.error("Failed to get response");
      setMessages(prev => prev.slice(0, -1));
      setInput(msg);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome */}
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 text-xs flex-shrink-0 mt-1">✦</div>
          <div className="bg-[#0d1117] border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-slate-300 max-w-[80%]">
            Hi <span className="text-white font-semibold">{user?.name}</span>! I'm your proactive AI agent —
            I can <span className="text-white font-medium">query your real data</span> and take actions like creating tasks automatically.
          </div>
        </div>

        {/* Suggestions */}
        {showSuggestions && messages.length === 0 && (
          <div className="pl-10 flex flex-wrap gap-2">
            {CHAT_SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-800 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-400 transition-all duration-200">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} className={`flex gap-3 animate-fade-up ${isUser ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1
                ${isUser ? "bg-gradient-to-br from-cyan-400 to-violet-500 text-gray-950" : "bg-slate-800 text-cyan-400 border border-slate-700"}`}>
                {isUser ? "U" : "✦"}
              </div>
              <div className={`flex flex-col gap-1.5 max-w-[75%] ${isUser ? "items-end" : ""}`}>
                {/* Tool badges */}
                {!isUser && msg.toolsUsed?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.toolsUsed.map((t, j) => (
                      <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium
                        ${ACTION_TOOLS.has(t) ? "text-violet-400 bg-violet-400/10 border-violet-400/20" : "text-cyan-400 bg-cyan-400/8 border-cyan-400/15"}`}>
                        {ACTION_TOOLS.has(t) ? "⚡" : "⚙"} {TOOL_LABELS[t] || t}
                      </span>
                    ))}
                  </div>
                )}
                {/* Action log */}
                {!isUser && msg.actionsLog?.map((a, j) => {
                  const cfg = ACTION_LABELS[a.tool];
                  if (!cfg) return null;
                  return (
                    <div key={j} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${cfg.color}`}>
                      <span className="font-bold">{cfg.icon}</span>
                      <span className="font-semibold">{cfg.label}:</span>
                      <span className="opacity-80">
                        {a.tool === "create_study_plan"     && `${a.result.tasksCreated} tasks added`}
                        {a.tool === "mark_tasks_complete"   && `${a.result.markedDone} marked done`}
                        {a.tool === "create_reminder"       && a.result.reminder}
                        {a.tool === "clear_completed_tasks" && `${a.result.deleted} removed`}
                      </span>
                    </div>
                  );
                })}
                {/* Bubble */}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                  ${isUser
                    ? "bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 text-white rounded-tr-sm"
                    : "bg-[#0d1117] border border-slate-800 text-slate-300 rounded-tl-sm"
                  }`}>
                  {msg.text.split("\n").map((line, j, arr) => (
                    <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 text-xs">✦</div>
            <div className="bg-[#0d1117] border border-slate-800 rounded-2xl rounded-tl-sm"><TypingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800/60 p-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask me anything… (Enter to send)"
          rows={1}
          disabled={loading}
          className="input-field flex-1 resize-none text-sm"
          style={{ minHeight: "40px", maxHeight: "100px" }}
          onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
        />
        <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="btn-primary px-3 py-2.5 flex-shrink-0">
          {loading ? <span className="spinner" style={{ borderTopColor: "#060910" }} /> : "↑"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TAB 2: ASK PDF
// ─────────────────────────────────────────────────────────────────────
function PDFTab() {
  const [documents, setDocuments]   = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [subjects, setSubjects]     = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const fileInputRef = useRef(null);
  const bottomRef    = useRef(null);

  useEffect(() => {
    API.get("/rag/documents").then(r => setDocuments(r.data)).catch(() => {});
    API.get("/subjects").then(r => setSubjects(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleUpload = async (file) => {
    if (!file || file.type !== "application/pdf") { toast.error("PDF files only"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setUploading(true);
    const tid = toast.loading(`Processing ${file.name}…`);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      fd.append("subjectName", subjectName || "General");
      const res = await API.post("/rag/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`✓ ${res.data.totalChunks} sections indexed!${res.data.xp ? ` +${res.data.xp.pointsEarned} XP` : ""}`, { id: tid });
      const docs = await API.get("/rag/documents");
      setDocuments(docs.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed", { id: tid });
    }
    setUploading(false);
  };

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q || !selectedDoc || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await API.post("/rag/ask", { documentId: selectedDoc._id, question: q, history: messages.map(m => ({ role: m.role, text: m.text })) });
      setMessages(prev => [...prev, { role: "model", text: res.data.answer, chunksUsed: res.data.chunksUsed }]);
    } catch { toast.error("Failed to get answer"); setMessages(prev => prev.slice(0, -1)); setInput(q); }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-3 p-3 border-b border-slate-800/60">
        {/* Upload */}
        <div className="flex gap-2 flex-1 flex-wrap">
          <select value={subjectName} onChange={e => setSubjectName(e.target.value)} className="input-field text-sm flex-shrink-0" style={{ width: "140px" }}>
            <option value="">General</option>
            {subjects.map(s => <option key={s._id} value={s.subject}>{s.subject}</option>)}
          </select>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="btn-ghost text-sm px-3 py-2 flex items-center gap-2">
            {uploading ? <span className="spinner" style={{ width: "14px", height: "14px", borderTopColor: "#22d3ee" }} /> : "📄"}
            {uploading ? "Processing…" : "Upload PDF"}
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => { handleUpload(e.target.files?.[0]); e.target.value = ""; }} />
        </div>

        {/* Doc selector */}
        {documents.length > 0 && (
          <select value={selectedDoc?._id || ""} onChange={e => { const d = documents.find(d => d._id === e.target.value); setSelectedDoc(d || null); setMessages([]); }}
            className="input-field text-sm flex-shrink-0" style={{ width: "180px" }}>
            <option value="">Select document…</option>
            {documents.map(d => <option key={d._id} value={d._id}>{d.filename.slice(0, 25)}</option>)}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!selectedDoc ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-3xl mb-2">📄</p>
              <p className="text-white font-semibold mb-1">Upload a PDF</p>
              <p className="text-slate-500 text-sm">Then select it to start asking questions</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 text-xs flex-shrink-0">◈</div>
              <div className="bg-[#0d1117] border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-slate-300 max-w-[80%]">
                <span className="text-white font-semibold">{selectedDoc.filename}</span> indexed into{" "}
                <span className="text-cyan-400 font-semibold">{selectedDoc.totalChunks} sections</span>. Ask me anything!
              </div>
            </div>
            <div className="pl-10 flex flex-wrap gap-2">
              {["Summarize the main points", "What are the key concepts?", "Give me 5 practice questions"].map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-800 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-400 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div key={i} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1
                    ${isUser ? "bg-gradient-to-br from-cyan-400 to-violet-500 text-gray-950" : "bg-slate-800 text-cyan-400 border border-slate-700"}`}>
                    {isUser ? "U" : "◈"}
                  </div>
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                    ${isUser ? "bg-cyan-500/10 border border-cyan-500/20 text-white rounded-tr-sm" : "bg-[#0d1117] border border-slate-800 text-slate-300 rounded-tl-sm"}`}>
                    {msg.text.split("\n").map((l, j, arr) => <span key={j}>{l}{j < arr.length - 1 && <br />}</span>)}
                    {msg.chunksUsed && <p className="text-[10px] text-slate-600 mt-2 pt-1 border-t border-slate-800">◈ Based on {msg.chunksUsed} sections</p>}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 text-xs">◈</div>
                <div className="bg-[#0d1117] border border-slate-800 rounded-2xl rounded-tl-sm"><TypingDots /></div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-800/60 p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={selectedDoc ? "Ask about your PDF… (Enter to send)" : "Select a document first…"}
          disabled={!selectedDoc || loading}
          rows={1}
          className="input-field flex-1 resize-none text-sm"
          style={{ minHeight: "40px", maxHeight: "100px" }}
          onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
        />
        <button onClick={() => sendMessage()} disabled={!input.trim() || !selectedDoc || loading} className="btn-primary px-3 py-2.5 flex-shrink-0">
          {loading ? <span className="spinner" style={{ borderTopColor: "#060910" }} /> : "↑"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TAB 3: SUMMARIZE NOTES
// ─────────────────────────────────────────────────────────────────────
const DIFFICULTY_STYLE = {
  beginner:     "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  intermediate: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  advanced:     "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const SUMMARY_TABS = [
  { key: "summary",    label: "Summary",    icon: "◈" },
  { key: "keypoints",  label: "Key Points", icon: "✦" },
  { key: "flashcards", label: "Flashcards", icon: "◎" },
  { key: "questions",  label: "Practice Q", icon: "?" },
];

function Flashcard({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div onClick={() => setFlipped(!flipped)} className="cursor-pointer" style={{ perspective: "1000px" }}>
      <div className="relative h-28 transition-all duration-500" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        <div className="absolute inset-0 card p-4 flex flex-col items-center justify-center text-center border-cyan-500/20" style={{ backfaceVisibility: "hidden" }}>
          <p className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-1">Q</p>
          <p className="text-white text-sm font-medium">{front}</p>
          <p className="text-[10px] text-slate-600 mt-2">Tap to reveal</p>
        </div>
        <div className="absolute inset-0 card p-4 flex flex-col items-center justify-center text-center border-violet-500/20" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-1">A</p>
          <p className="text-slate-300 text-sm">{back}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryTab() {
  const [notes, setNotes]           = useState("");
  const [subjects, setSubjects]     = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [activeTab, setActiveTab]   = useState("summary");
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  useEffect(() => {
    API.get("/subjects").then(r => setSubjects(r.data)).catch(() => {});
  }, []);

  const handleSummarize = async () => {
    if (!notes.trim()) { toast.error("Paste your notes first"); return; }
    if (notes.trim().length < 50) { toast.error("Notes too short"); return; }
    setLoading(true);
    setResult(null);
    const tid = toast.loading("Analysing your notes…");
    try {
      const res = await API.post("/summary", { notes, subjectId: selectedSubject || undefined });
      setResult(res.data);
      setActiveTab("summary");
      toast.success(`Notes summarized!${res.data.xp ? ` +${res.data.xp.pointsEarned} XP` : ""}`, { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || "Error summarizing", { id: tid });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Input area */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-field text-sm">
            <option value="">No subject</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.subject}</option>)}
          </select>
          <div className="relative">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Paste your lecture notes or textbook content here…"
              rows={8}
              className="input-field resize-none text-sm w-full"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-slate-600">{wordCount} words</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSummarize} disabled={loading || !notes.trim()} className="btn-primary flex-1">
              {loading ? <span className="spinner" /> : "✦"}
              {loading ? "Analysing…" : "Summarize with AI"}
            </button>
            {(notes || result) && (
              <button onClick={() => { setNotes(""); setResult(null); }} className="btn-ghost px-3">Clear</button>
            )}
          </div>
        </div>

        {/* Result */}
        {!result ? (
          <div className="card flex items-center justify-center text-center p-8 border-dashed">
            <div>
              <p className="text-3xl text-slate-700 mb-2">✦</p>
              <p className="text-slate-500 text-sm">AI output appears here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${DIFFICULTY_STYLE[result.difficulty] || DIFFICULTY_STYLE.intermediate}`}>
                {result.difficulty}
              </span>
              <span className="text-xs text-slate-500">{result.wordCount} words</span>
              {result.topics?.map((t, i) => (
                <span key={i} className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-lg">{t}</span>
              ))}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-[#0d1117] border border-slate-800 rounded-xl p-1">
              {SUMMARY_TABS.map(({ key, label, icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs font-medium transition-all
                    ${activeTab === key ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                  {icon} <span className="hidden sm:block">{label}</span>
                </button>
              ))}
            </div>

            <div className="card p-4 max-h-64 overflow-y-auto">
              {activeTab === "summary" && <p className="text-slate-300 text-sm leading-relaxed">{result.summary}</p>}
              {activeTab === "keypoints" && (
                <div className="space-y-2">
                  {result.keyPoints?.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-[#060910] rounded-lg">
                      <span className="w-5 h-5 rounded-md bg-cyan-400/10 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                      <p className="text-slate-300 text-sm">{p}</p>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "flashcards" && (
                <div className="grid grid-cols-1 gap-2">
                  {result.flashcards?.map((c, i) => <Flashcard key={i} front={c.front} back={c.back} />)}
                </div>
              )}
              {activeTab === "questions" && (
                <div className="space-y-2">
                  {result.practiceQuestions?.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-[#060910] rounded-lg">
                      <span className="w-5 h-5 rounded-md bg-violet-400/10 text-violet-400 text-xs font-bold flex items-center justify-center flex-shrink-0">Q{i+1}</span>
                      <p className="text-slate-300 text-sm">{q}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <h2 className="page-title">AI Assistant</h2>
        <p className="page-subtitle">Your complete AI study toolkit — chat, PDF analysis, and note summarization</p>
      </div>

      <div className="card animate-fade-up-1 flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: "560px" }}>

        {/* Tab bar */}
        <div className="flex border-b border-slate-800/60 flex-shrink-0">
          {TABS.map(({ key, label, icon, desc }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 px-2 text-sm font-medium transition-all duration-200 border-b-2
                ${activeTab === key
                  ? "border-cyan-400 text-cyan-400 bg-cyan-400/5"
                  : "border-transparent text-slate-500 hover:text-slate-300"
                }`}>
              <span className="text-lg">{icon}</span>
              <span className="font-display font-semibold text-xs">{label}</span>
              <span className="text-[10px] text-slate-600 hidden md:block">{desc}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat"    && <ChatTab />}
          {activeTab === "pdf"     && <PDFTab />}
          {activeTab === "summary" && <SummaryTab />}
        </div>
      </div>
    </Layout>
  );
}