import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import API from "../utils/api";

const STAGES = { HOME: "home", QUIZ: "quiz", RESULT: "result" };

export default function Quiz() {
  const [subjects, setSubjects]           = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [numQuestions, setNumQuestions]   = useState(5);
  const [generating, setGenerating]       = useState(false);
  const [stage, setStage]                 = useState(STAGES.HOME);
  const [quiz, setQuiz]                   = useState(null);
  const [answers, setAnswers]             = useState({});
  const [submitting, setSubmitting]       = useState(false);
  const [result, setResult]               = useState(null);
  const [pastQuizzes, setPastQuizzes]     = useState([]);
  const [loadingPast, setLoadingPast]     = useState(true);
  const navigate                          = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    fetchSubjects();
    fetchPastQuizzes();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await API.get("/subjects");
      setSubjects(res.data);
    } catch (_) {}
  };

  const fetchPastQuizzes = async () => {
    setLoadingPast(true);
    try {
      const res = await API.get("/quiz");
      setPastQuizzes(res.data);
    } catch (_) {}
    setLoadingPast(false);
  };

  const handleGenerate = async () => {
    if (!selectedSubject) { toast.error("Please select a subject"); return; }
    setGenerating(true);
    const toastId = toast.loading("AI is generating your quiz…");
    try {
      const res = await API.post("/quiz/generate", {
        subjectId: selectedSubject,
        numQuestions,
      });
      setQuiz(res.data);
      setAnswers({});
      setStage(STAGES.QUIZ);
      toast.success("Quiz ready! Good luck 🎯", { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || "Error generating quiz", { id: toastId });
    }
    setGenerating(false);
  };

  const handleSelect = (questionIndex, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      toast.error("Please answer all questions before submitting");
      return;
    }
    setSubmitting(true);
    try {
      const answersArray = quiz.questions.map((_, i) => answers[i] ?? -1);
      const res = await API.post(`/quiz/${quiz._id}/submit`, { answers: answersArray });
      setResult(res.data);
      setStage(STAGES.RESULT);
      fetchPastQuizzes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error submitting quiz");
    }
    setSubmitting(false);
  };

  const handleRetry = () => {
    setStage(STAGES.HOME);
    setQuiz(null);
    setAnswers({});
    setResult(null);
  };

  const answeredCount = Object.keys(answers).length;
  const totalQ        = quiz?.questions?.length || 0;

  // ── Score color ───────────────────────────────────────────────────
  const scoreColor = (pct) =>
    pct >= 80 ? "text-emerald-400" :
    pct >= 50 ? "text-amber-400"  : "text-rose-400";

  const scoreBg = (pct) =>
    pct >= 80 ? "from-emerald-400/20 to-emerald-400/5 border-emerald-400/30" :
    pct >= 50 ? "from-amber-400/20 to-amber-400/5 border-amber-400/30"       :
                "from-rose-400/20 to-rose-400/5 border-rose-400/30";

  return (
    <Layout>

      {/* ── HOME STAGE ────────────────────────────────────────────── */}
      {stage === STAGES.HOME && (
        <>
          <div className="mb-8 animate-fade-up">
            <h2 className="page-title">Quiz</h2>
            <p className="page-subtitle">Test your knowledge with AI-generated multiple choice questions</p>
          </div>

          {/* Generate card */}
          <div className="card p-6 mb-8 animate-fade-up-1">
            <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
              <span className="gradient-text">◎</span> Generate New Quiz
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="space-y-2">
                <label className="label">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select a subject…</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>{s.subject}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="label">Number of Questions</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="input-field"
                >
                  {[3, 5, 7, 10].map((n) => (
                    <option key={n} value={n}>{n} questions</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={handleGenerate} className="btn-primary" disabled={generating}>
              {generating ? <span className="spinner" /> : <span>◎</span>}
              {generating ? "Generating Quiz…" : "Generate Quiz with AI"}
            </button>
          </div>

          {/* Past quizzes */}
          <div className="animate-fade-up-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white">Past Quizzes</h3>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">
                {pastQuizzes.length} total
              </span>
            </div>

            {loadingPast ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : pastQuizzes.length === 0 ? (
              <div className="card p-10 text-center border-dashed">
                <p className="text-2xl text-slate-700 mb-2">◎</p>
                <p className="text-slate-500 text-sm">No quizzes yet. Generate one above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastQuizzes.map((q, i) => (
                  <div
                    key={q._id}
                    className="card p-4 flex items-center gap-4 animate-fade-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm flex-shrink-0
                      ${q.attempted
                        ? q.score / q.total >= 0.8 ? "bg-emerald-400/15 text-emerald-400"
                        : q.score / q.total >= 0.5 ? "bg-amber-400/15 text-amber-400"
                        :                            "bg-rose-400/15 text-rose-400"
                        : "bg-slate-800 text-slate-400"
                      }`}>
                      {q.attempted ? `${Math.round((q.score / q.total) * 100)}%` : "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {q.subjectId?.subject || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {q.total} questions •{" "}
                        {q.attempted
                          ? `${q.score}/${q.total} correct`
                          : "Not attempted"
                        }
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider
                      ${q.attempted
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-slate-800 text-slate-500"
                      }`}>
                      {q.attempted ? "Done" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── QUIZ STAGE ────────────────────────────────────────────── */}
      {stage === STAGES.QUIZ && quiz && (
        <div className="animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="page-title">{quiz.subjectId?.subject || "Quiz"}</h2>
              <p className="page-subtitle">{totalQ} questions • Answer all before submitting</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display font-bold gradient-text">
                {answeredCount}/{totalQ}
              </p>
              <p className="text-xs text-slate-500">answered</p>
            </div>
          </div>

          {/* Progress */}
          <div className="h-1.5 bg-slate-800 rounded-full mb-8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(answeredCount / totalQ) * 100}%`,
                background: "linear-gradient(90deg, #22d3ee, #8b5cf6)",
              }}
            />
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {quiz.questions.map((q, qi) => (
              <div key={qi} className="card p-6 animate-fade-up" style={{ animationDelay: `${qi * 0.05}s` }}>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">
                  Question {qi + 1}
                </p>
                <p className="text-white font-medium text-base leading-relaxed mb-5">{q.question}</p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, oi) => {
                    const selected = answers[qi] === oi;
                    return (
                      <button
                        key={oi}
                        onClick={() => handleSelect(qi, oi)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 font-medium
                          ${selected
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                            : "border-slate-800 bg-[#060910] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                          }`}
                      >
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold mr-3 flex-shrink-0
                          ${selected ? "bg-cyan-500 text-gray-950" : "bg-slate-800 text-slate-500"}`}>
                          {["A","B","C","D"][oi]}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="mt-8 flex gap-3 flex-wrap">
            <button onClick={handleRetry} className="btn-ghost">
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount < totalQ}
              className="btn-primary flex-1"
            >
              {submitting ? <span className="spinner" /> : null}
              {submitting
                ? "Submitting…"
                : answeredCount < totalQ
                ? `Answer ${totalQ - answeredCount} more question${totalQ - answeredCount > 1 ? "s" : ""}`
                : "Submit Quiz →"
              }
            </button>
          </div>
        </div>
      )}

      {/* ── RESULT STAGE ──────────────────────────────────────────── */}
      {stage === STAGES.RESULT && result && (
        <div className="animate-fade-up">
          <h2 className="page-title mb-2">Quiz Results</h2>
          <p className="page-subtitle mb-8">Here's how you did</p>

          {/* Score card */}
          <div className={`card p-8 mb-8 text-center bg-gradient-to-b border ${scoreBg(result.percentage)}`}>
            <p className={`font-display font-bold text-7xl mb-2 ${scoreColor(result.percentage)}`}>
              {result.percentage}%
            </p>
            <p className="text-white font-semibold text-lg mb-1">
              {result.score} / {result.total} correct
            </p>
            <p className="text-slate-400 text-sm">{result.message}</p>
          </div>

          {/* Question breakdown */}
          <h3 className="font-display font-semibold text-white mb-4">Question Breakdown</h3>
          <div className="space-y-4 mb-8">
            {result.results.map((r, i) => (
              <div
                key={i}
                className={`card p-5 border-l-4 animate-fade-up ${r.isCorrect ? "border-l-emerald-400" : "border-l-rose-400"}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className={`text-lg flex-shrink-0 ${r.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                    {r.isCorrect ? "✓" : "✕"}
                  </span>
                  <p className="text-white text-sm font-medium leading-relaxed">{r.question}</p>
                </div>
                <div className="grid grid-cols-1 gap-1.5 ml-7">
                  {r.options.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2
                        ${oi === r.correct
                          ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                          : oi === r.selected && !r.isCorrect
                          ? "bg-rose-400/10 text-rose-400 border border-rose-400/20"
                          : "text-slate-600"
                        }`}
                    >
                      <span className="flex-shrink-0">
                        {oi === r.correct ? "✓" : oi === r.selected && !r.isCorrect ? "✕" : "·"}
                      </span>
                      {opt}
                      {oi === r.correct && (
                        <span className="ml-auto text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Correct</span>
                      )}
                      {oi === r.selected && !r.isCorrect && (
                        <span className="ml-auto text-[10px] text-rose-400 font-bold uppercase tracking-wider">Your answer</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleRetry} className="btn-ghost">
              ← Back to Quiz Home
            </button>
            <button onClick={handleGenerate} className="btn-primary">
              <span>◎</span> Try Another Quiz
            </button>
          </div>
        </div>
      )}

    </Layout>
  );
}