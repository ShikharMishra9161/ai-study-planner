const express = require("express");
const Task    = require("../models/Task");
const Subject = require("../models/Subject");
const User    = require("../models/User");
const auth    = require("../middleware/auth");
const genAI   = require("../config/gemini");
const { awardXP } = require("./xpRoutes");

const router = express.Router();

// ── Generate Study Tasks ──────────────────────────────────────────────
router.post("/generate", auth, async (req, res) => {
  try {
    const { subjectId } = req.body;

    const subject = await Subject.findOne({ _id: subjectId, userId: req.user });
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const user         = await User.findById(req.user).select("name");
    const allTasks     = await Task.find({ userId: req.user });
    const subjectTasks = await Task.find({ userId: req.user, subjectId });
    const doneTasks    = subjectTasks.filter((t) => t.status === "done");
    const pendingTasks = subjectTasks.filter((t) => t.status === "pending");
    const totalDone    = allTasks.filter((t) => t.status === "done").length;

    const subjectCompletionRate = subjectTasks.length
      ? Math.round((doneTasks.length / subjectTasks.length) * 100) : 0;
    const overallCompletionRate = allTasks.length
      ? Math.round((totalDone / allTasks.length) * 100) : 0;

    const difficulty =
      subjectCompletionRate >= 80 ? "advanced and challenging" :
      subjectCompletionRate >= 50 ? "intermediate" :
      subjectCompletionRate > 0   ? "simple and beginner-friendly" :
                                    "beginner-friendly since this is their first time";

    const prompt = `
You are a smart AI study coach creating a personalized study plan.
Student: ${user?.name}, Subject: ${subject.subject}
Chapters: ${subject.chapters.join(", ")}
Completion rate: ${subjectCompletionRate}%
Already completed: ${doneTasks.map(t => `- ${t.task}`).join("\n") || "None"}
Pending: ${pendingTasks.map(t => `- ${t.task}`).join("\n") || "None"}

Generate exactly 10 NEW ${difficulty} study tasks.
Do NOT repeat completed or pending tasks.
Return ONLY a plain numbered list, no markdown.`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const taskList = response.text
      .split("\n")
      .map(l => l.replace(/^[\s\*\-\#]+/, "").replace(/^\d+\.\s*/, "").replace(/\*\*/g, "").trim())
      .filter(l => l.length > 5)
      .slice(0, 10);

    const tasks = await Promise.all(
      taskList.map(task => new Task({ userId: req.user, subjectId, task }).save())
    );

    // ✅ Award XP
    const xpResult = await awardXP(req.user, "generate_tasks");

    res.json({
      tasks,
      xp: xpResult,
      meta: { studentName: user?.name, subject: subject.subject, subjectCompletionRate, overallCompletionRate, difficulty, totalGenerated: tasks.length },
    });
  } catch (error) {
    console.error("Generate tasks error:", error);
    res.status(500).json({ message: "Error generating tasks", error: error.message });
  }
});

// ── Get All Tasks ─────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user }).populate("subjectId", "subject").sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error });
  }
});

// ── Get Tasks by Subject ──────────────────────────────────────────────
router.get("/subject/:subjectId", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user, subjectId: req.params.subjectId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error });
  }
});

// ── Update Task Status ────────────────────────────────────────────────
router.put("/:id", auth, async (req, res) => {
  try {
    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      { status: req.body.status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Task not found" });

    // ✅ Award XP when marked complete
    let xpResult = null;
    if (req.body.status === "done") {
      xpResult = await awardXP(req.user, "complete_task");
    }

    res.json({ ...updated.toObject(), xp: xpResult });
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error });
  }
});

// ── Delete Task ───────────────────────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error });
  }
});

module.exports = router;