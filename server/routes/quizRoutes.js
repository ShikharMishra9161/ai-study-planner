const express = require("express");
const Quiz    = require("../models/Quiz");
const Subject = require("../models/Subject");
const auth    = require("../middleware/auth");
const genAI   = require("../config/gemini");
const { awardXP } = require("./xpRoutes");

const router = express.Router();

// ── Generate Quiz ─────────────────────────────────────────────────────
router.post("/generate", auth, async (req, res) => {
  try {
    const { subjectId, numQuestions = 5 } = req.body;

    const subject = await Subject.findOne({ _id: subjectId, userId: req.user });
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const count = Math.min(Math.max(numQuestions, 3), 10);

    const prompt = `
Generate exactly ${count} multiple choice questions for "${subject.subject}".
Chapters: ${subject.chapters.join(", ")}.
Return ONLY valid JSON array, no markdown, no code blocks.
Each object: { "question": string, "options": [4 strings], "correct": number 0-3 }`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = response.text.trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let questions;
    try { questions = JSON.parse(text); }
    catch { return res.status(500).json({ message: "AI returned invalid format. Please try again." }); }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ message: "AI returned empty quiz. Please try again." });
    }

    const validQuestions = questions.filter(q =>
      q.question && Array.isArray(q.options) && q.options.length === 4 &&
      typeof q.correct === "number" && q.correct >= 0 && q.correct <= 3
    );

    if (validQuestions.length === 0) {
      return res.status(500).json({ message: "AI returned invalid questions. Please try again." });
    }

    const quiz = new Quiz({ userId: req.user, subjectId, questions: validQuestions, total: validQuestions.length });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({ message: "Error generating quiz", error: error.message });
  }
});

// ── Submit Quiz ───────────────────────────────────────────────────────
router.post("/:id/submit", auth, async (req, res) => {
  try {
    const { answers } = req.body;

    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user });
    if (!quiz)       return res.status(404).json({ message: "Quiz not found" });
    if (quiz.attempted) return res.status(400).json({ message: "Quiz already submitted" });

    let score = 0;
    const results = quiz.questions.map((q, i) => {
      const selected = answers[i] ?? -1;
      const correct  = selected === q.correct;
      if (correct) score++;
      return { question: q.question, options: q.options, correct: q.correct, selected, isCorrect: correct };
    });

    quiz.score     = score;
    quiz.attempted = true;
    quiz.takenAt   = new Date();
    await quiz.save();

    const percentage = Math.round((score / quiz.total) * 100);

    // ✅ Award XP — more for passing (>=70%)
    const xpResult = await awardXP(
      req.user,
      percentage >= 70 ? "pass_quiz" : "attempt_quiz"
    );

    res.json({
      score,
      total:   quiz.total,
      percentage,
      results,
      xp:      xpResult,
      message:
        score === quiz.total    ? "Perfect score! 🎉" :
        percentage >= 70        ? "Great job! 👏" :
        percentage >= 50        ? "Good effort! Keep practicing 💪" :
                                  "Keep studying, you'll get there! 📚",
    });
  } catch (error) {
    res.status(500).json({ message: "Error submitting quiz", error: error.message });
  }
});

// ── Get All Quizzes ───────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ userId: req.user })
      .populate("subjectId", "subject")
      .sort({ createdAt: -1 })
      .select("-questions");
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching quizzes", error });
  }
});

// ── Get Single Quiz ───────────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user }).populate("subjectId", "subject");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: "Error fetching quiz", error });
  }
});

// ── Delete Quiz ───────────────────────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    await Quiz.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Quiz deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting quiz", error });
  }
});

module.exports = router;