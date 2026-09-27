const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const validateEnv = require("./utils/validateEnv");
const connectDB = require("./config/db");
const helmet = require("helmet");

validateEnv();

const authRoutes    = require("./routes/authRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const taskRoutes    = require("./routes/taskRoutes");
const aiRoutes      = require("./routes/aiRoutes");
const quizRoutes    = require("./routes/quizRoutes");
const chatRoutes    = require("./routes/chatRoutes");
const summaryRoutes = require("./routes/summaryRoutes");
const streakRoutes  = require("./routes/streakRoutes");
const { router: xpRoutes } = require("./routes/xpRoutes");
const gameRoutes    = require("./routes/gameRoutes");
const ragRoutes     = require("./routes/ragRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://ai-study-planner-omega-five.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(compression());
app.use(helmet());

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests, please try again later." },
});

app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRateLimiter, aiRoutes);
app.use("/api/quiz", aiRateLimiter, quizRoutes);
app.use("/api/chat", aiRateLimiter, chatRoutes);
app.use("/api/summary", aiRateLimiter, summaryRoutes);
app.use("/api/streak", streakRoutes);
app.use("/api/xp", xpRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/profile", profileRoutes);

app.get("/", (req, res) => res.send("Welcome to AI Study Planner Backend 🚀"));
app.get("/ping", (req, res) => res.json({ message: "pong" }));
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "ok",
    db: dbState,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

if (require.main === module) {
  connectDB().then(() => {
    require("./jobs/reminderJob");
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
  }).catch((err) => {
    console.error("Failed to connect to DB, server not started:", err.message);
    process.exit(1);
  });
}

module.exports = app;