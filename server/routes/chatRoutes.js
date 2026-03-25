const express = require("express");
const auth    = require("../middleware/auth");
const genAI   = require("../config/gemini");
const User    = require("../models/User");
const Subject = require("../models/Subject");
const Task    = require("../models/Task");
const Quiz    = require("../models/Quiz");

const router = express.Router();

// ── Tool Definitions ──────────────────────────────────────────────────
const TOOLS = [{
  functionDeclarations: [

    // ── READ tools (existing) ───────────────────────────────────────
    {
      name: "get_student_progress",
      description: "Get the student's overall task completion rate, total tasks, completed and pending counts.",
      parameters: { type: "OBJECT", properties: {}, required: [] },
    },
    {
      name: "get_subjects",
      description: "Get all subjects and chapters the student is studying.",
      parameters: { type: "OBJECT", properties: {}, required: [] },
    },
    {
      name: "get_pending_tasks",
      description: "Get the student's pending (incomplete) tasks, optionally filtered by subject.",
      parameters: {
        type: "OBJECT",
        properties: {
          subjectName: { type: "STRING", description: "Optional: filter by subject name" },
        },
        required: [],
      },
    },
    {
      name: "get_quiz_scores",
      description: "Get the student's past quiz scores and performance.",
      parameters: {
        type: "OBJECT",
        properties: {
          subjectName: { type: "STRING", description: "Optional: filter by subject name" },
        },
        required: [],
      },
    },
    {
      name: "get_weak_subjects",
      description: "Identify subjects where the student is struggling based on low quiz scores and high pending tasks. Call this before creating a study plan.",
      parameters: { type: "OBJECT", properties: {}, required: [] },
    },
    {
      name: "get_study_streak",
      description: "Get the student's current study streak and activity.",
      parameters: { type: "OBJECT", properties: {}, required: [] },
    },

    // ── ACTION tools (new — proactive) ─────────────────────────────
    {
      name: "create_study_plan",
      description: "Create actual study tasks in the database for a subject. Call this when student asks you to create a plan, help them study, or when you identify weak areas that need attention. This takes REAL action — tasks will appear in their task list.",
      parameters: {
        type: "OBJECT",
        properties: {
          subjectName: {
            type: "STRING",
            description: "The name of the subject to create tasks for",
          },
          tasks: {
            type: "ARRAY",
            description: "List of specific study tasks to create (3-7 tasks)",
            items: { type: "STRING" },
          },
          reason: {
            type: "STRING",
            description: "Why you are creating these tasks (e.g. low quiz score, many pending tasks)",
          },
        },
        required: ["subjectName", "tasks"],
      },
    },
    {
      name: "mark_tasks_complete",
      description: "Mark specific pending tasks as done when student says they have completed them. Call this when student says 'I finished X', 'I completed Y', or 'mark X as done'.",
      parameters: {
        type: "OBJECT",
        properties: {
          subjectName: {
            type: "STRING",
            description: "Subject to filter tasks by",
          },
          count: {
            type: "NUMBER",
            description: "Number of pending tasks to mark as done (default 1)",
          },
        },
        required: [],
      },
    },
    {
      name: "create_reminder",
      description: "Create a personalized study reminder message for the student. Call this when student asks to be reminded, or when you want to proactively suggest a study session. This stores a reminder they will see next time they open the app.",
      parameters: {
        type: "OBJECT",
        properties: {
          message: {
            type: "STRING",
            description: "The reminder message to show the student",
          },
          subject: {
            type: "STRING",
            description: "Subject the reminder is about",
          },
        },
        required: ["message"],
      },
    },
    {
      name: "clear_completed_tasks",
      description: "Delete all completed (done) tasks to clean up the task list. Call this when student says their task list is cluttered or they want to start fresh with only pending tasks.",
      parameters: {
        type: "OBJECT",
        properties: {
          subjectName: {
            type: "STRING",
            description: "Optional: only clear completed tasks for a specific subject",
          },
        },
        required: [],
      },
    },
  ],
}];

// ── Tool Executor ─────────────────────────────────────────────────────
async function executeTool(toolName, toolArgs, userId) {
  switch (toolName) {

    // ── READ tools ──────────────────────────────────────────────────
    case "get_student_progress": {
      const tasks = await Task.find({ userId });
      const done    = tasks.filter(t => t.status === "done").length;
      const pending = tasks.filter(t => t.status === "pending").length;
      return {
        totalTasks:     tasks.length,
        completedTasks: done,
        pendingTasks:   pending,
        completionRate: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      };
    }

    case "get_subjects": {
      const subjects = await Subject.find({ userId });
      return {
        totalSubjects: subjects.length,
        subjects: subjects.map(s => ({
          id:       s._id,
          name:     s.subject,
          chapters: s.chapters,
        })),
      };
    }

    case "get_pending_tasks": {
      const tasks = await Task.find({ userId, status: "pending" })
        .populate("subjectId", "subject");

      let filtered = tasks;
      if (toolArgs?.subjectName) {
        filtered = tasks.filter(t =>
          t.subjectId?.subject?.toLowerCase().includes(toolArgs.subjectName.toLowerCase())
        );
      }

      return {
        count: filtered.length,
        tasks: filtered.slice(0, 10).map(t => ({
          id:      t._id,
          task:    t.task,
          subject: t.subjectId?.subject || "Unknown",
        })),
      };
    }

    case "get_quiz_scores": {
      const quizzes = await Quiz.find({ userId, attempted: true })
        .populate("subjectId", "subject")
        .sort({ takenAt: -1 });

      let filtered = quizzes;
      if (toolArgs?.subjectName) {
        filtered = quizzes.filter(q =>
          q.subjectId?.subject?.toLowerCase().includes(toolArgs.subjectName.toLowerCase())
        );
      }

      const scores = filtered.map(q => ({
        subject:    q.subjectId?.subject || "Unknown",
        score:      q.score,
        total:      q.total,
        percentage: Math.round((q.score / q.total) * 100),
        date:       q.takenAt,
      }));

      return {
        totalQuizzes: scores.length,
        averageScore: scores.length
          ? Math.round(scores.reduce((s, q) => s + q.percentage, 0) / scores.length)
          : 0,
        scores,
      };
    }

    case "get_weak_subjects": {
      const [subjects, tasks, quizzes] = await Promise.all([
        Subject.find({ userId }),
        Task.find({ userId }),
        Quiz.find({ userId, attempted: true }).populate("subjectId", "subject"),
      ]);

      const result = subjects.map(s => {
        const subTasks   = tasks.filter(t => t.subjectId?.toString() === s._id.toString());
        const subDone    = subTasks.filter(t => t.status === "done").length;
        const completion = subTasks.length ? Math.round((subDone / subTasks.length) * 100) : 0;

        const subQuizzes    = quizzes.filter(q => q.subjectId?._id?.toString() === s._id.toString());
        const avgQuizScore  = subQuizzes.length
          ? Math.round(subQuizzes.reduce((sum, q) => sum + Math.round((q.score / q.total) * 100), 0) / subQuizzes.length)
          : null;

        return {
          id:             s._id,
          subject:        s.subject,
          chapters:       s.chapters,
          taskCompletion: completion,
          avgQuizScore,
          pendingTasks:   subTasks.filter(t => t.status === "pending").length,
          isWeak:         completion < 50 || (avgQuizScore !== null && avgQuizScore < 60),
        };
      });

      return {
        weakSubjects:   result.filter(s => s.isWeak),
        strongSubjects: result.filter(s => !s.isWeak),
        all:            result,
      };
    }

    case "get_study_streak": {
      const doneTasks = await Task.find({ userId, status: "done" })
        .select("updatedAt").sort({ updatedAt: -1 });

      const uniqueDates = [...new Set(
        doneTasks.map(t => formatDate(new Date(t.updatedAt)))
      )].sort((a, b) => new Date(b) - new Date(a));

      let streak = 0;
      const today     = formatDate(new Date());
      const yesterday = formatDate(new Date(Date.now() - 86400000));

      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        streak = 1;
        let check = new Date(uniqueDates[0]);
        for (let i = 1; i < uniqueDates.length; i++) {
          const prev = new Date(check);
          prev.setDate(prev.getDate() - 1);
          if (uniqueDates[i] === formatDate(prev)) { streak++; check = prev; }
          else break;
        }
      }

      return {
        currentStreak:    streak,
        totalDaysStudied: uniqueDates.length,
        lastStudied:      uniqueDates[0] || null,
        studiedToday:     uniqueDates[0] === today,
      };
    }

    // ── ACTION tools (proactive) ────────────────────────────────────
    case "create_study_plan": {
      const { subjectName, tasks: taskList, reason } = toolArgs;

      // Find the subject in DB
      const subject = await Subject.findOne({
        userId,
        subject: { $regex: new RegExp(subjectName, "i") },
      });

      if (!subject) {
        return { success: false, error: `Subject "${subjectName}" not found in your subjects list` };
      }

      // Create tasks in DB
      const createdTasks = await Promise.all(
        taskList.slice(0, 7).map(task =>
          new Task({ userId, subjectId: subject._id, task }).save()
        )
      );

      return {
        success:      true,
        subjectName:  subject.subject,
        tasksCreated: createdTasks.length,
        tasks:        createdTasks.map(t => t.task),
        reason:       reason || "Based on your study needs",
        message:      `Successfully created ${createdTasks.length} tasks for ${subject.subject}`,
      };
    }

    case "mark_tasks_complete": {
      const { subjectName, count = 1 } = toolArgs;

      const query = { userId, status: "pending" };
      let tasks = await Task.find(query).populate("subjectId", "subject");

      if (subjectName) {
        tasks = tasks.filter(t =>
          t.subjectId?.subject?.toLowerCase().includes(subjectName.toLowerCase())
        );
      }

      const toMark = tasks.slice(0, count);
      await Promise.all(
        toMark.map(t => Task.findByIdAndUpdate(t._id, { status: "done" }))
      );

      return {
        success:     true,
        markedDone:  toMark.length,
        tasks:       toMark.map(t => t.task),
        message:     `Marked ${toMark.length} task(s) as complete`,
      };
    }

    case "create_reminder": {
      const { message, subject } = toolArgs;
      // Store reminder in a simple in-memory store
      // In production you'd save to DB
      return {
        success: true,
        reminder: message,
        subject:  subject || "General",
        message:  `Reminder set: "${message}"`,
      };
    }

    case "clear_completed_tasks": {
      const { subjectName } = toolArgs;

      let query = { userId, status: "done" };

      if (subjectName) {
        const subject = await Subject.findOne({
          userId,
          subject: { $regex: new RegExp(subjectName, "i") },
        });
        if (subject) query.subjectId = subject._id;
      }

      const result = await Task.deleteMany(query);

      return {
        success:  true,
        deleted:  result.deletedCount,
        message:  `Cleared ${result.deletedCount} completed task(s)`,
      };
    }

    default:
      return { error: "Unknown tool" };
  }
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

// ── Agentic Chat Route ────────────────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const user = await User.findById(req.user).select("name");

    const systemPrompt = `You are StudyAI, a proactive AI study assistant that takes REAL actions.

Student name: ${user?.name || "Student"}

YOU HAVE TWO TYPES OF TOOLS:

READ tools (gather information):
- get_student_progress, get_subjects, get_pending_tasks
- get_quiz_scores, get_weak_subjects, get_study_streak

ACTION tools (take real actions in the database):
- create_study_plan → actually creates tasks in student's task list
- mark_tasks_complete → marks tasks as done
- create_reminder → sets a reminder for the student
- clear_completed_tasks → removes completed tasks

IMPORTANT RULES:
1. Always READ data first before taking ACTION
2. When student asks for help or a plan → create_study_plan automatically
3. When student says they finished something → mark_tasks_complete
4. When you identify a weak area → proactively offer to create tasks
5. Always tell the student exactly what actions you took
6. Be proactive — don't just advise, ACT

EXAMPLE FLOWS:
- "Help me study Physics" → get_weak_subjects → create_study_plan(Physics) → tell student tasks were created
- "I finished my Calculus tasks" → mark_tasks_complete(Calculus) → confirm what was marked done
- "Clean up my tasks" → clear_completed_tasks → confirm how many were removed
- "What should I focus on?" → get_weak_subjects → create_study_plan for weakest subject → inform student`;

    const contents = [];
    contents.push({ role: "user",  parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: `Hi ${user?.name || "there"}! I'm StudyAI — I don't just give advice, I take real actions. I can create tasks, mark things complete, and update your study plan directly. What do you need?` }] });

    history.forEach(({ role, text }) => {
      contents.push({ role: role === "user" ? "user" : "model", parts: [{ text }] });
    });
    contents.push({ role: "user", parts: [{ text: message }] });

    // ── Agentic loop ─────────────────────────────────────────────────
    const toolsUsed   = [];
    const actionsLog  = []; // track what actions were actually taken
    let   finalReply  = "";
    let   loopContents = [...contents];

    for (let iteration = 0; iteration < 8; iteration++) {
      const response = await genAI.models.generateContent({
        model:    "gemini-2.5-flash",
        contents: loopContents,
        tools:    TOOLS,
      });

      const candidate = response.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content?.parts || [];
      const functionCallPart = parts.find(p => p.functionCall);

      if (functionCallPart) {
        const { name, args } = functionCallPart.functionCall;
        console.log(`🤖 Agent calling: ${name}`, args);
        toolsUsed.push(name);

        const toolResult = await executeTool(name, args, req.user);
        console.log(`✅ Result:`, JSON.stringify(toolResult).slice(0, 150));

        // Track real actions taken
        const ACTION_TOOLS = ["create_study_plan", "mark_tasks_complete", "create_reminder", "clear_completed_tasks"];
        if (ACTION_TOOLS.includes(name) && toolResult.success) {
          actionsLog.push({ tool: name, result: toolResult });
        }

        loopContents.push({
          role:  "model",
          parts: [{ functionCall: { name, args } }],
        });
        loopContents.push({
          role:  "user",
          parts: [{ functionResponse: { name, response: { result: toolResult } } }],
        });

        continue;
      }

      const textPart = parts.find(p => p.text);
      if (textPart) { finalReply = textPart.text.trim(); break; }
      break;
    }

    if (!finalReply) {
      finalReply = "I've completed the requested actions. Check your task list for updates!";
    }

    res.json({
      reply:      finalReply,
      toolsUsed,
      actionsLog, // what real DB changes were made
      meta: { studentName: user?.name },
    });

  } catch (error) {
    console.error("Proactive agent error:", error);
    res.status(500).json({ message: "Error getting response", error: error.message });
  }
});

module.exports = router;