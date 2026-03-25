const express = require("express");
const auth    = require("../middleware/auth");
const genAI   = require("../config/gemini");
const Subject = require("../models/Subject");
const { awardXP } = require("./xpRoutes");

const router = express.Router();

// ── Summarize Notes ───────────────────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const { notes, subjectId } = req.body;

    if (!notes?.trim()) return res.status(400).json({ message: "Notes content is required" });
    if (notes.trim().length < 50) return res.status(400).json({ message: "Notes are too short." });

    let subjectContext = "";
    if (subjectId) {
      const subject = await Subject.findOne({ _id: subjectId, userId: req.user });
      if (subject) subjectContext = `Subject: ${subject.subject}. Chapters: ${subject.chapters.join(", ")}.`;
    }

    const prompt = `
You are an expert study assistant. Analyze the following notes.
${subjectContext ? `Context: ${subjectContext}` : ""}

NOTES:
"""
${notes.trim()}
"""

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "summary": "3-5 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "flashcards": [
    { "front": "Question", "back": "Answer" }
  ],
  "practiceQuestions": ["Q1?", "Q2?", "Q3?", "Q4?", "Q5?"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "topics": ["topic1", "topic2", "topic3"]
}

Rules:
- exactly 5 keyPoints
- exactly 6 flashcards
- exactly 5 practiceQuestions`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = response.text.trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let result;
    try { result = JSON.parse(text); }
    catch { return res.status(500).json({ message: "AI returned invalid format. Please try again." }); }

    if (!result.summary || !result.keyPoints || !result.flashcards || !result.practiceQuestions) {
      return res.status(500).json({ message: "AI returned incomplete data. Please try again." });
    }

    // ✅ Award XP for summarizing notes
    const xpResult = await awardXP(req.user, "summarize_notes");

    res.json({
      ...result,
      wordCount: notes.trim().split(/\s+/).length,
      charCount: notes.trim().length,
      xp:        xpResult,
    });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ message: "Error summarizing notes", error: error.message });
  }
});

module.exports = router;