const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const connectDB = require("./config/db");

const authRoutes    = require("./routes/authRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const taskRoutes    = require("./routes/taskRoutes");
const aiRoutes      = require("./routes/aiRoutes");
const quizRoutes = require("./routes/quizRoutes");
const chatRoutes = require("./routes/chatRoutes");
const summaryRoutes = require("./routes/summaryRoutes");
const streakRoutes = require("./routes/streakRoutes");
const { router: xpRoutes } = require("./routes/xpRoutes");
const gameRoutes = require("./routes/gameRoutes");
const ragRoutes = require("./routes/ragRoutes");

const app  = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://ai-study-planner-omega-five.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests, please try again later." },
});

// Middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handles preflight requests
app.use(express.json());
app.use(compression());

// Connect DB first, then start server + cron jobs
connectDB().then(() => {

  require("./jobs/reminderJob");

  // Routes
  app.use("/api/auth",     authRoutes);
  app.use("/api/subjects", subjectRoutes);
  app.use("/api/tasks",    taskRoutes);
  app.use("/api/ai",       aiRateLimiter, aiRoutes);
  app.use("/api/quiz",     aiRateLimiter, quizRoutes);
  app.use("/api/chat",     aiRateLimiter, chatRoutes);
  app.use("/api/summary",  aiRateLimiter, summaryRoutes);
  app.use("/api/streak",   streakRoutes);
  app.use("/api/xp",       xpRoutes);
  app.use("/api/games",    gameRoutes);
  app.use("/api/rag",      ragRoutes);

  // Health check routes
  app.get("/", (req, res) => res.send("Welcome to AI Study Planner Backend 🚀"));
  app.get("/ping", (req, res) => res.json({ message: "pong" }));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  });

  app.listen(PORT, () =>
    console.log(`✅ Server running on http://localhost:${PORT}`)
  );

}).catch((err) => {
  console.error("Failed to connect to DB, server not started:", err.message);
  process.exit(1);
});