import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import API from "../utils/api";

const GAMES = [
  { key: "daily",   label: "Daily Challenge", icon: "🏆", desc: "5 questions • Resets daily" },
  { key: "scramble",label: "Word Scramble",   icon: "🔤", desc: "Unscramble key terms"       },
  { key: "blitz",   label: "True/False Blitz",icon: "⚡", desc: "10 statements • Beat the clock" },
];

// ─────────────────────────────────────────────────────────────────────
// DAILY CHALLENGE
// ─────────────────────────────────────────────────────────────────────
function DailyChallenge() {
  const [stage, setStage]     = useState("home"); // home | playing | result
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate]       = useState("");

  const fetchChallenge = async () => {
    setLoading(true);
    try {
      const res = await API.get("/games/daily");
      setQuestions(res.data.questions);
      setDate(res.data.date);
      setStage("playing");
      setAnswers({});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load challenge");
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Please answer all questions first");
      return;
    }
    setLoading(true);
    try {
      const answersArray = questions.map((_, i) => answers[i] ?? -1);
      const res = await API.post("/games/daily/submit", { answers: answersArray });
      setResult(res.data);
      setStage("result");
      if (res.data.xp) toast.success(`+${res.data.xp.pointsEarned} XP earned!`);
    } catch (err) {
      toast.error("Failed to submit");
    }
    setLoading(false);
  };

  if (stage === "home") return (
    <div className="text-center py-12">
      <p className="text-5xl mb-4">🏆</p>
      <h3 className="font-display font-bold text-2xl text-white mb-2">Daily Challenge</h3>
      <p className="text-slate-500 text-sm mb-2">5 general knowledge questions</p>
      <p className="text-xs text-slate-600 mb-8">Resets every day at midnight • Earn XP for completing</p>
      <button onClick={fetchChallenge} disabled={loading} className="btn-primary mx-auto">
        {loading ? <span className="spinner" /> : "🏆"}
        {loading ? "Loading…" : "Start Today's Challenge"}
      </button>
    </div>
  );

  if (stage === "playing") return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-xl text-white">Daily Challenge</h3>
          <p className="text-xs text-slate-500">{date} • {Object.keys(answers).length}/{questions.length} answered</p>
        </div>
        <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%`, background: "linear-gradient(90deg,#22d3ee,#8b5cf6)" }} />
        </div>
      </div>

      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div key={qi} className="card p-5 animate-fade-up" style={{ animationDelay: `${qi * 0.05}s` }}>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-2">Question {qi + 1}</p>
            <p className="text-white font-medium mb-4 leading-relaxed">{q.question}</p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt, oi) => (
                <button key={oi} onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
                  className={`text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200
                    ${answers[qi] === oi
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                      : "border-slate-800 bg-[#060910] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                    }`}>
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold mr-3
                    ${answers[qi] === oi ? "bg-cyan-500 text-gray-950" : "bg-slate-800 text-slate-500"}`}>
                    {["A","B","C","D"][oi]}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={() => setStage("home")} className="btn-ghost">← Back</button>
        <button onClick={handleSubmit} disabled={loading || Object.keys(answers).length < questions.length}
          className="btn-primary flex-1">
          {loading ? <span className="spinner" /> : null}
          {loading ? "Submitting…" : Object.keys(answers).length < questions.length
            ? `Answer ${questions.length - Object.keys(answers).length} more`
            : "Submit Challenge →"}
        </button>
      </div>
    </div>
  );

  if (stage === "result" && result) return (
    <div>
      <div className={`card p-8 text-center mb-6 border
        ${result.percentage >= 80 ? "border-emerald-400/30 bg-emerald-400/5" :
          result.percentage >= 60 ? "border-amber-400/30 bg-amber-400/5" :
                                    "border-rose-400/30 bg-rose-400/5"}`}>
        <p className={`font-display font-bold text-6xl mb-2
          ${result.percentage >= 80 ? "text-emerald-400" : result.percentage >= 60 ? "text-amber-400" : "text-rose-400"}`}>
          {result.percentage}%
        </p>
        <p className="text-white font-semibold mb-1">{result.score}/{result.total} correct</p>
        <p className="text-slate-400 text-sm">{result.message}</p>
        {result.xp && <p className="text-cyan-400 text-sm font-bold mt-2">+{result.xp.pointsEarned} XP earned!</p>}
      </div>

      <div className="space-y-3 mb-6">
        {result.results.map((r, i) => (
          <div key={i} className={`card p-4 border-l-4 ${r.isCorrect ? "border-l-emerald-400" : "border-l-rose-400"}`}>
            <div className="flex items-start gap-2 mb-2">
              <span className={r.isCorrect ? "text-emerald-400" : "text-rose-400"}>{r.isCorrect ? "✓" : "✕"}</span>
              <p className="text-white text-sm font-medium">{r.question}</p>
            </div>
            {r.explanation && <p className="text-slate-500 text-xs ml-5">{r.explanation}</p>}
          </div>
        ))}
      </div>

      <button onClick={() => setStage("home")} className="btn-ghost w-full">← Back to Games</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// WORD SCRAMBLE
// ─────────────────────────────────────────────────────────────────────
function WordScramble({ subjects }) {
  const [stage, setStage]         = useState("home");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [words, setWords]         = useState([]);
  const [answers, setAnswers]     = useState([]); // server-side answers
  const [currentIdx, setCurrentIdx] = useState(0);
  const [guess, setGuess]         = useState("");
  const [results, setResults]     = useState([]);
  const [score, setScore]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [checking, setChecking]   = useState(false);
  const [feedback, setFeedback]   = useState(null); // "correct" | "wrong"
  const inputRef = useRef(null);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await API.post("/games/scramble/generate", {
        subjectId: selectedSubject || undefined,
      });
      setWords(res.data.words);
      setAnswers(res.data.answers);
      setCurrentIdx(0);
      setResults([]);
      setScore(0);
      setGuess("");
      setFeedback(null);
      setStage("playing");
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      toast.error("Failed to generate game");
    }
    setLoading(false);
  };

  const checkAnswer = async () => {
    if (!guess.trim()) return;
    setChecking(true);
    try {
      const res = await API.post("/games/scramble/check", {
        guess:  guess.trim(),
        answer: answers[currentIdx],
      });

      setFeedback(res.data.correct ? "correct" : "wrong");
      setResults(prev => [...prev, { ...words[currentIdx], guess: guess.trim(), correct: res.data.correct, answer: answers[currentIdx] }]);

      if (res.data.correct) {
        setScore(s => s + 1);
        if (res.data.xp) toast.success(`+${res.data.xp.pointsEarned} XP!`, { duration: 1500 });
      }

      setTimeout(() => {
        setFeedback(null);
        setGuess("");
        if (currentIdx + 1 >= words.length) {
          setStage("result");
        } else {
          setCurrentIdx(i => i + 1);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }, 1000);
    } catch (_) {}
    setChecking(false);
  };

  const currentWord = words[currentIdx];
  const progress    = (currentIdx / words.length) * 100;

  if (stage === "home") return (
    <div className="text-center py-12">
      <p className="text-5xl mb-4">🔤</p>
      <h3 className="font-display font-bold text-2xl text-white mb-2">Word Scramble</h3>
      <p className="text-slate-500 text-sm mb-6">Unscramble key academic terms from your subjects</p>
      <div className="max-w-xs mx-auto mb-6">
        <label className="label mb-2 block text-left">Subject (optional)</label>
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-field">
          <option value="">General academic terms</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.subject}</option>)}
        </select>
      </div>
      <button onClick={generate} disabled={loading} className="btn-primary mx-auto">
        {loading ? <span className="spinner" /> : "🔤"}
        {loading ? "Generating…" : "Start Game"}
      </button>
    </div>
  );

  if (stage === "playing" && currentWord) return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{currentIdx + 1} / {words.length}</p>
        <p className="text-sm font-bold text-cyan-400">Score: {score}</p>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, background: "linear-gradient(90deg,#22d3ee,#8b5cf6)" }} />
      </div>

      <div className="card p-8 text-center mb-6">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-2">{currentWord.category}</p>

        {/* Scrambled word */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {currentWord.scrambled.split("").map((letter, i) => (
            <div key={i} className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center font-display font-bold text-white text-lg">
              {letter}
            </div>
          ))}
        </div>

        <p className="text-slate-400 text-sm mb-1">💡 {currentWord.hint}</p>
        <p className="text-slate-600 text-xs mb-6">{currentWord.length} letters</p>

        {/* Input */}
        <div className="flex gap-2 max-w-xs mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={guess}
            onChange={e => setGuess(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && checkAnswer()}
            placeholder="Your answer…"
            className={`input-field flex-1 text-center font-display font-bold tracking-wider uppercase
              ${feedback === "correct" ? "border-emerald-400 bg-emerald-400/10" :
                feedback === "wrong"   ? "border-rose-400 bg-rose-400/10" : ""}`}
            disabled={checking}
            maxLength={20}
          />
          <button onClick={checkAnswer} disabled={!guess.trim() || checking} className="btn-primary px-4">
            {checking ? <span className="spinner" /> : "→"}
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <p className={`mt-3 text-sm font-bold animate-fade-up ${feedback === "correct" ? "text-emerald-400" : "text-rose-400"}`}>
            {feedback === "correct" ? "✓ Correct! +10 XP" : `✕ The answer was ${answers[currentIdx]}`}
          </p>
        )}
      </div>

      <button onClick={() => { setStage("result"); }} className="btn-ghost w-full text-sm">
        Skip remaining →
      </button>
    </div>
  );

  if (stage === "result") return (
    <div>
      <div className="card p-8 text-center mb-6">
        <p className="text-5xl mb-3">{score === words.length ? "🏆" : score >= words.length / 2 ? "🎉" : "📚"}</p>
        <p className="font-display font-bold text-4xl text-white mb-1">{score}/{words.length}</p>
        <p className="text-slate-400 text-sm">
          {score === words.length ? "Perfect! All correct!" :
           score >= words.length * 0.6 ? "Great job!" : "Keep practicing!"}
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {results.map((r, i) => (
          <div key={i} className={`card p-3 flex items-center gap-3 border-l-4 ${r.correct ? "border-l-emerald-400" : "border-l-rose-400"}`}>
            <span className={r.correct ? "text-emerald-400" : "text-rose-400"}>{r.correct ? "✓" : "✕"}</span>
            <div className="flex-1">
              <p className="text-xs text-slate-500">{r.scrambled} →</p>
              <p className="text-white text-sm font-bold">{r.answer}</p>
            </div>
            {!r.correct && <p className="text-xs text-slate-500">You: {r.guess}</p>}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setStage("home")} className="btn-ghost flex-1">← Back</button>
        <button onClick={generate} className="btn-primary flex-1">Play Again</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TRUE / FALSE BLITZ
// ─────────────────────────────────────────────────────────────────────
function TrueFalseBlitz({ subjects }) {
  const [stage, setStage]         = useState("home");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [statements, setStatements] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore]           = useState(0);
  const [results, setResults]       = useState([]);
  const [timeLeft, setTimeLeft]     = useState(10);
  const [feedback, setFeedback]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const timerRef = useRef(null);

  const startTimer = () => {
    setTimeLeft(10);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleAnswer(null); // time up = wrong
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (stage === "playing" && statements.length > 0 && !feedback) {
      startTimer();
    }
    return () => stopTimer();
  }, [currentIdx, stage, feedback]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await API.post("/games/blitz/generate", {
        subjectId: selectedSubject || undefined,
      });
      setStatements(res.data.statements);
      setCurrentIdx(0);
      setScore(0);
      setResults([]);
      setFeedback(null);
      setStage("playing");
    } catch (err) {
      toast.error("Failed to generate game");
    }
    setLoading(false);
  };

  const handleAnswer = (userAnswer) => {
    stopTimer();
    const current = statements[currentIdx];
    if (!current) return;

    const correct = userAnswer === current.answer;
    if (correct) setScore(s => s + 1);

    const result = {
      statement:   current.statement,
      answer:      current.answer,
      userAnswer,
      correct,
      explanation: current.explanation,
      timedOut:    userAnswer === null,
    };

    setResults(prev => [...prev, result]);
    setFeedback(correct ? "correct" : "wrong");

    setTimeout(() => {
      setFeedback(null);
      if (currentIdx + 1 >= statements.length) {
        // Award XP
        const percentage = Math.round(((score + (correct ? 1 : 0)) / statements.length) * 100);
        API.post("/games/blitz/complete", { score: score + (correct ? 1 : 0), total: statements.length })
          .then(res => { if (res.data.xp) toast.success(`+${res.data.xp.pointsEarned} XP!`); })
          .catch(() => {});
        setStage("result");
      } else {
        setCurrentIdx(i => i + 1);
      }
    }, 1200);
  };

  const current = statements[currentIdx];
  const timerPct = (timeLeft / 10) * 100;
  const timerColor = timeLeft > 6 ? "#22d3ee" : timeLeft > 3 ? "#f59e0b" : "#f87171";

  if (stage === "home") return (
    <div className="text-center py-12">
      <p className="text-5xl mb-4">⚡</p>
      <h3 className="font-display font-bold text-2xl text-white mb-2">True/False Blitz</h3>
      <p className="text-slate-500 text-sm mb-2">10 statements • 10 seconds each</p>
      <p className="text-xs text-slate-600 mb-6">Answer fast — speed matters!</p>
      <div className="max-w-xs mx-auto mb-6">
        <label className="label mb-2 block text-left">Subject (optional)</label>
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-field">
          <option value="">General knowledge</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.subject}</option>)}
        </select>
      </div>
      <button onClick={generate} disabled={loading} className="btn-primary mx-auto">
        {loading ? <span className="spinner" /> : "⚡"}
        {loading ? "Generating…" : "Start Blitz"}
      </button>
    </div>
  );

  if (stage === "playing" && current) return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{currentIdx + 1} / {statements.length}</p>
        <div className="flex items-center gap-2">
          <p className="font-display font-bold text-white">Score: {score}</p>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-slate-800 rounded-full mb-6 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 linear"
          style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>

      {/* Statement card */}
      <div className={`card p-8 text-center mb-6 transition-all duration-300
        ${feedback === "correct" ? "border-emerald-400/50 bg-emerald-400/5" :
          feedback === "wrong"   ? "border-rose-400/50 bg-rose-400/5" : ""}`}>

        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-xl"
            style={{ background: timerColor + "20", color: timerColor, border: `2px solid ${timerColor}40` }}>
            {timeLeft}
          </div>
        </div>

        <p className="text-white font-medium text-lg leading-relaxed mb-6">{current.statement}</p>

        {feedback ? (
          <div className="animate-fade-up">
            <p className={`font-bold text-lg mb-1 ${feedback === "correct" ? "text-emerald-400" : "text-rose-400"}`}>
              {feedback === "correct" ? "✓ Correct!" : "✕ Wrong!"}
            </p>
            <p className="text-xs text-slate-400">{current.explanation}</p>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            <button onClick={() => handleAnswer(true)}
              className="flex-1 max-w-[140px] py-4 rounded-2xl border-2 border-emerald-400/40 bg-emerald-400/10 text-emerald-400 font-display font-bold text-lg hover:bg-emerald-400/20 transition-all duration-200 active:scale-95">
              ✓ TRUE
            </button>
            <button onClick={() => handleAnswer(false)}
              className="flex-1 max-w-[140px] py-4 rounded-2xl border-2 border-rose-400/40 bg-rose-400/10 text-rose-400 font-display font-bold text-lg hover:bg-rose-400/20 transition-all duration-200 active:scale-95">
              ✕ FALSE
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (stage === "result") {
    const finalScore = results.filter(r => r.correct).length;
    const pct = Math.round((finalScore / statements.length) * 100);
    return (
      <div>
        <div className={`card p-8 text-center mb-6
          ${pct >= 80 ? "border-emerald-400/30 bg-emerald-400/5" :
            pct >= 60 ? "border-amber-400/30 bg-amber-400/5" :
                        "border-rose-400/30 bg-rose-400/5"}`}>
          <p className="text-5xl mb-3">{pct >= 80 ? "⚡" : pct >= 60 ? "🎉" : "📚"}</p>
          <p className={`font-display font-bold text-5xl mb-1
            ${pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-rose-400"}`}>
            {pct}%
          </p>
          <p className="text-white font-semibold">{finalScore}/{statements.length} correct</p>
        </div>

        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className={`card p-3 border-l-4 ${r.correct ? "border-l-emerald-400" : "border-l-rose-400"}`}>
              <div className="flex items-start gap-2">
                <span className={`flex-shrink-0 ${r.correct ? "text-emerald-400" : "text-rose-400"}`}>
                  {r.correct ? "✓" : r.timedOut ? "⏱" : "✕"}
                </span>
                <div>
                  <p className="text-white text-xs font-medium">{r.statement}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Answer: <span className={r.answer ? "text-emerald-400" : "text-rose-400"}>{r.answer ? "TRUE" : "FALSE"}</span>
                    {r.timedOut && <span className="text-amber-400 ml-2">• Time out</span>}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStage("home")} className="btn-ghost flex-1">← Back</button>
          <button onClick={generate} className="btn-primary flex-1">Play Again ⚡</button>
        </div>
      </div>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// MAIN GAMES PAGE
// ─────────────────────────────────────────────────────────────────────
export default function Games() {
  const [activeGame, setActiveGame] = useState("daily");
  const [subjects, setSubjects]     = useState([]);
  const navigate                    = useNavigate();

  useEffect(() => {
    API.get("/subjects").then(res => setSubjects(res.data)).catch(() => {});
  }, []);

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h2 className="page-title">Games</h2>
        <p className="page-subtitle">Learn while you play — earn XP for every game you complete</p>
      </div>

      {/* Game selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-fade-up-1">
        {GAMES.map(({ key, label, icon, desc }) => (
          <button key={key} onClick={() => setActiveGame(key)}
            className={`card p-4 text-left transition-all duration-200
              ${activeGame === key ? "border-cyan-500/40 bg-cyan-500/5" : "hover:border-slate-700"}`}>
            <p className="text-2xl mb-2">{icon}</p>
            <p className={`font-display font-semibold text-sm mb-1 ${activeGame === key ? "text-cyan-400" : "text-white"}`}>
              {label}
            </p>
            <p className="text-xs text-slate-500">{desc}</p>
          </button>
        ))}
      </div>

      {/* Game area */}
      <div className="card p-6 animate-fade-up-2">
        {activeGame === "daily"   && <DailyChallenge />}
        {activeGame === "scramble"&& <WordScramble subjects={subjects} />}
        {activeGame === "blitz"   && <TrueFalseBlitz subjects={subjects} />}
      </div>
    </Layout>
  );
}