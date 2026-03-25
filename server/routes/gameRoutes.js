const express = require("express");
const auth    = require("../middleware/auth");
const genAI   = require("../config/gemini");
const Subject = require("../models/Subject");
const { awardXP } = require("./xpRoutes");

const router = express.Router();

// ── In-memory store for daily challenge (resets each day) ─────────────
// In production use Redis, but for portfolio this works fine
let dailyChallengeCache = {
  date:      null,
  questions: [],
};

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ── DAILY CHALLENGE ───────────────────────────────────────────────────
// GET /api/games/daily — get today's challenge
router.get("/daily", auth, async (req, res) => {
  try {
    const today = getTodayStr();

    // Generate new challenge if it's a new day or cache is empty
    if (dailyChallengeCache.date !== today || dailyChallengeCache.questions.length === 0) {
      const prompt = `
Generate 5 general knowledge multiple choice questions suitable for students.
Topics: science, mathematics, history, geography, or general knowledge.
Make them moderately challenging but not too hard.

Return ONLY a valid JSON array, no markdown, no code blocks:
[
  {
    "question": "Question text",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "explanation": "Brief explanation of the correct answer"
  }
]`;

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let text = response.text.trim()
        .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

      let questions;
      try { questions = JSON.parse(text); }
      catch { return res.status(500).json({ message: "Failed to generate challenge. Try again." }); }

      dailyChallengeCache = { date: today, questions };
    }

    res.json({
      date:           today,
      questions:      dailyChallengeCache.questions.map(q => ({
        question: q.question,
        options:  q.options,
        // Don't send correct answer to frontend before submission
      })),
      totalQuestions: dailyChallengeCache.questions.length,
    });
  } catch (error) {
    console.error("Daily challenge error:", error);
    res.status(500).json({ message: "Error fetching daily challenge", error: error.message });
  }
});

// POST /api/games/daily/submit — submit answers
router.post("/daily/submit", auth, async (req, res) => {
  try {
    const { answers } = req.body;
    const questions   = dailyChallengeCache.questions;

    if (!questions.length) {
      return res.status(400).json({ message: "No active challenge. Please refresh." });
    }

    let score = 0;
    const results = questions.map((q, i) => {
      const selected = answers[i] ?? -1;
      const correct  = selected === q.correct;
      if (correct) score++;
      return {
        question:    q.question,
        options:     q.options,
        correct:     q.correct,
        selected,
        isCorrect:   correct,
        explanation: q.explanation || "",
      };
    });

    const percentage = Math.round((score / questions.length) * 100);

    // Award XP based on score
    const xpAction = percentage >= 80 ? "pass_quiz" : "attempt_quiz";
    const xpResult = await awardXP(req.user, xpAction);

    res.json({
      score,
      total:      questions.length,
      percentage,
      results,
      xp:         xpResult,
      message:
        percentage === 100 ? "Perfect! You aced the daily challenge! 🏆" :
        percentage >= 80   ? "Excellent work! 🎉" :
        percentage >= 60   ? "Good effort! Keep it up 💪" :
                             "Keep practicing! You'll do better tomorrow 📚",
    });
  } catch (error) {
    res.status(500).json({ message: "Error submitting challenge", error: error.message });
  }
});

// ── WORD SCRAMBLE ─────────────────────────────────────────────────────
// POST /api/games/scramble/generate
router.post("/scramble/generate", auth, async (req, res) => {
  try {
    const { subjectId } = req.body;

    let contextInfo = "general academic topics";
    if (subjectId) {
      const subject = await Subject.findOne({ _id: subjectId, userId: req.user });
      if (subject) {
        contextInfo = `the subject "${subject.subject}" with chapters: ${subject.chapters.join(", ")}`;
      }
    }

    const prompt = `
Generate 5 key terms or words related to ${contextInfo}.
Each word should be at least 6 characters long.

Return ONLY a valid JSON array, no markdown:
[
  {
    "word": "PHOTOSYNTHESIS",
    "hint": "The process plants use to convert sunlight into food",
    "category": "Biology"
  }
]

Rules:
- Words must be at least 6 characters
- All words in UPPERCASE
- Hints should be clear and helpful
- Return exactly 5 words`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = response.text.trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let words;
    try { words = JSON.parse(text); }
    catch { return res.status(500).json({ message: "Failed to generate words. Try again." }); }

    // Scramble each word
    const scrambleWord = (word) => {
      const arr = word.split("");
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      // Make sure scrambled != original
      const scrambled = arr.join("");
      return scrambled === word ? scrambleWord(word) : scrambled;
    };

    const gameWords = words.slice(0, 5).map(w => ({
      scrambled: scrambleWord(w.word.toUpperCase()),
      hint:      w.hint,
      category:  w.category,
      length:    w.word.length,
      answer:    w.word.toUpperCase(), // will be checked server-side
    }));

    // Store answers temporarily (send without answers to frontend)
    res.json({
      words: gameWords.map(({ answer, ...rest }) => rest), // don't send answer
      answers: gameWords.map(w => w.answer),               // keep for verification
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating scramble", error: error.message });
  }
});

// POST /api/games/scramble/check — check a single word answer
router.post("/scramble/check", auth, async (req, res) => {
  try {
    const { guess, answer } = req.body;
    const correct = guess.toUpperCase().trim() === answer.toUpperCase().trim();

    let xpResult = null;
    if (correct) {
      // Award small XP for each correct word
      xpResult = await awardXP(req.user, "complete_task"); // reuse +10 XP
    }

    res.json({ correct, xp: xpResult });
  } catch (error) {
    res.status(500).json({ message: "Error checking answer", error: error.message });
  }
});

// ── TRUE OR FALSE BLITZ ───────────────────────────────────────────────
// POST /api/games/blitz/generate
router.post("/blitz/generate", auth, async (req, res) => {
  try {
    const { subjectId } = req.body;

    let contextInfo = "general science, math, and history";
    if (subjectId) {
      const subject = await Subject.findOne({ _id: subjectId, userId: req.user });
      if (subject) {
        contextInfo = `"${subject.subject}" covering chapters: ${subject.chapters.join(", ")}`;
      }
    }

    const prompt = `
Generate 10 true or false statements about ${contextInfo}.
Mix of 5 true and 5 false statements (roughly).

Return ONLY a valid JSON array, no markdown:
[
  {
    "statement": "The Earth revolves around the Sun",
    "answer": true,
    "explanation": "The Earth orbits the Sun, not the other way around"
  }
]

Rules:
- Exactly 10 statements
- Clear, unambiguous statements
- Interesting and educational
- Mix true and false roughly equally`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = response.text.trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let statements;
    try { statements = JSON.parse(text); }
    catch { return res.status(500).json({ message: "Failed to generate statements. Try again." }); }

    res.json({
      statements: statements.slice(0, 10).map(s => ({
        statement:   s.statement,
        explanation: s.explanation,
        answer:      s.answer, // send answer (revealed after each answer in blitz mode)
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating blitz", error: error.message });
  }
});

// POST /api/games/blitz/complete — award XP when blitz is done
router.post("/blitz/complete", auth, async (req, res) => {
  try {
    const { score, total } = req.body;
    const percentage = Math.round((score / total) * 100);

    const xpAction = percentage >= 70 ? "pass_quiz" : "attempt_quiz";
    const xpResult = await awardXP(req.user, xpAction);

    res.json({ xp: xpResult });
  } catch (error) {
    res.status(500).json({ message: "Error awarding XP", error: error.message });
  }
});

module.exports = router;