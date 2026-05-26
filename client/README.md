cat > /mnt/user-data/outputs/README.md << 'READMEEOF'

# 🎓 StudyAI — AI-Powered Study Planner

<div align="center">

![StudyAI Banner](https://img.shields.io/badge/StudyAI-AI%20Study%20Planner-cyan?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-18+-brightgreen?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)

**A full-stack gamified AI study platform with a proactive AI agent, RAG pipeline, OCR support, and real-time analytics.**

[Live Demo](https://ai-study-planner-omega-five.vercel.app/) · [Report Bug](https://github.com/ShikharMishra9161/ai-study-planner/issues) · [Request Feature](https://github.com/ShikharMishra9161/ai-study-planner/issues)

</div>

---

## 📸 Screenshots

> Dashboard · AI Assistant · Games · Leaderboard

---

## ✨ Features

### 🤖 AI & Intelligence

- **Proactive AI Agent** — Gemini function calling with 10 tools that autonomously queries MongoDB, creates tasks, marks completions, and adapts study plans in real-time
- **Personalized Task Generation** — AI analyses student progress, completion rate, and weak areas before generating difficulty-adjusted tasks
- **RAG Pipeline** — Upload PDF notes or scanned images (OCR via Tesseract.js) and chat with your own study material
- **MCQ Quiz Generator** — AI generates subject-specific multiple choice quizzes with instant scoring and answer explanations
- **Notes Summarizer** — Paste lecture notes → get summary, key points, flip flashcards, and practice questions
- **AI Chat** — Multi-turn conversational AI with full student context awareness

### 🎮 Gamification

- **XP & Levels System** — 6 levels (Beginner → Legend), earn XP for every action
- **Study Streak Tracker** — GitHub-style activity grid, current and longest streak
- **Global Leaderboard** — Compete with other students ranked by XP
- **Daily Challenge** — 5 new questions every day, resets at midnight
- **Word Scramble** — Unscramble key terms from your own subjects
- **True/False Blitz** — 10 statements, 10 seconds each, beat the clock

### 📊 Analytics

- Bar chart — tasks completed vs pending per subject
- Donut chart — overall task status breakdown
- Quiz score history — colour-coded by performance
- Per-subject progress bars
- Real-time progress ring on dashboard

### 🔐 Security & Auth

- JWT authentication with bcrypt password hashing
- Protected routes (frontend + backend)
- Rate limiting on all AI routes
- Helmet HTTP security headers
- Input validation on all endpoints

### 📧 Automation

- Daily email reminders via Nodemailer + node-cron
- Beautiful HTML email template with task list
- Sends only to users with pending tasks

---

## 🛠️ Tech Stack

### Frontend

| Technology      | Purpose          |
| --------------- | ---------------- |
| React 18        | UI framework     |
| Tailwind CSS v4 | Styling          |
| Recharts        | Analytics charts |
| React Router v6 | Navigation       |
| React Hot Toast | Notifications    |
| Axios           | HTTP client      |

### Backend

| Technology              | Purpose                |
| ----------------------- | ---------------------- |
| Node.js + Express       | Server                 |
| MongoDB + Mongoose      | Database               |
| JWT + bcrypt            | Authentication         |
| Google Gemini 2.5 Flash | AI / LLM               |
| pdf-parse               | PDF text extraction    |
| Tesseract.js            | OCR for scanned images |
| Sharp                   | Image preprocessing    |
| Nodemailer              | Email service          |
| node-cron               | Scheduled jobs         |
| Multer                  | File uploads           |
| Helmet                  | Security headers       |
| express-rate-limit      | Rate limiting          |
| compression             | Response compression   |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Google AI Studio API key (Gemini)
- Gmail account with App Password

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/ShikharMishra9161/ai-study-planner.git
cd ai-study-planner
```

**2. Install backend dependencies**

```bash
cd server
npm install
```

**3. Install frontend dependencies**

```bash
cd ../client
npm install
```

**4. Configure environment variables**

Create `server/.env`:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_64_byte_hex_secret
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

**5. Run the application**

Backend:

```bash
cd server
node index.js
```

Frontend:

```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
ai-study-planner/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # Navbar, Layout, XPBar, StreakCard
│   │   ├── pages/            # All page components
│   │   └── utils/            # API instance
│   └── vercel.json           # Vercel routing config
│
└── server/                   # Express backend
    ├── config/               # DB + Gemini config
    ├── jobs/                 # Cron reminder job
    ├── middleware/           # JWT auth middleware
    ├── models/               # Mongoose schemas
    │   ├── User.js
    │   ├── Subject.js
    │   ├── Task.js
    │   ├── Quiz.js
    │   ├── XP.js
    │   └── Document.js
    ├── routes/               # API route handlers
    │   ├── authRoutes.js
    │   ├── subjectRoutes.js
    │   ├── taskRoutes.js
    │   ├── quizRoutes.js
    │   ├── chatRoutes.js     # Agentic AI with function calling
    │   ├── ragRoutes.js      # RAG pipeline + OCR
    │   ├── summaryRoutes.js
    │   ├── xpRoutes.js
    │   ├── gameRoutes.js
    │   ├── streakRoutes.js
    │   └── profileRoutes.js
    └── utils/                # mailer, chunker, ocr
```

---

## 🤖 Agentic AI Architecture

The AI chat uses **Gemini function calling** — the model autonomously decides which tools to call based on the student's message:

```
Student: "What should I study today?"
         ↓
Gemini thinks → calls get_weak_subjects()
             → calls get_pending_tasks()
             → calls get_study_streak()
             → creates tasks via create_study_plan()
         ↓
"Based on your 40% quiz score in Physics and
 8 pending tasks, I've created 5 focused tasks
 for you. Your 3-day streak is at risk — study today!"
```

### Available Tools (10 total)

| Tool                    | Type       | Action                    |
| ----------------------- | ---------- | ------------------------- |
| `get_student_progress`  | Read       | Fetch completion rate     |
| `get_subjects`          | Read       | Fetch all subjects        |
| `get_pending_tasks`     | Read       | Fetch incomplete tasks    |
| `get_quiz_scores`       | Read       | Fetch quiz history        |
| `get_weak_subjects`     | Read       | Identify struggling areas |
| `get_study_streak`      | Read       | Fetch streak data         |
| `create_study_plan`     | **Action** | Create tasks in DB        |
| `mark_tasks_complete`   | **Action** | Update task status        |
| `create_reminder`       | **Action** | Set reminder              |
| `clear_completed_tasks` | **Action** | Delete done tasks         |

---

## 📡 API Endpoints

### Auth

```
POST /api/auth/register
POST /api/auth/login
```

### Subjects

```
GET    /api/subjects
POST   /api/subjects
PUT    /api/subjects/:id
DELETE /api/subjects/:id
```

### Tasks

```
GET    /api/tasks
POST   /api/tasks/generate
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

### Quiz

```
POST /api/quiz/generate
POST /api/quiz/:id/submit
GET  /api/quiz
GET  /api/quiz/:id
```

### AI

```
POST /api/chat          # Agentic AI chat
POST /api/summary       # Notes summarizer
POST /api/rag/upload    # PDF/Image upload
POST /api/rag/ask       # RAG query
GET  /api/rag/documents
```

### Gamification

```
GET  /api/xp
GET  /api/xp/leaderboard
GET  /api/streak
GET  /api/games/daily
POST /api/games/daily/submit
POST /api/games/scramble/generate
POST /api/games/blitz/generate
```

---

## 🚢 Deployment

### Backend — Render

```
Root Directory:  server
Build Command:   npm install
Start Command:   node index.js
```

### Frontend — Vercel

```
Root Directory:  client
Build Command:   npm run build
Output Dir:      dist
```

### Environment Variables

Set all `server/.env` variables in Render dashboard.
Set `VITE_API_URL` in Vercel dashboard.

---

## 🎯 XP System

| Action            | XP Reward |
| ----------------- | --------- |
| Complete a task   | +10 XP    |
| Generate AI tasks | +15 XP    |
| Summarize notes   | +20 XP    |
| Attempt a quiz    | +20 XP    |
| Pass quiz (≥70%)  | +50 XP    |
| Use AI chat       | +5 XP     |
| 7-day streak      | +100 XP   |

| Level | Title       | XP Required |
| ----- | ----------- | ----------- |
| 1     | 🌱 Beginner | 0           |
| 2     | 📖 Student  | 200         |
| 3     | 🎓 Scholar  | 500         |
| 4     | ⚡ Expert   | 1,000       |
| 5     | 🏆 Master   | 2,000       |
| 6     | 👑 Legend   | 4,000       |

---

## 🔧 Configuration

### Gmail App Password Setup

1. Enable 2-Step Verification on Google account
2. Go to Google Account → Security → App Passwords
3. Generate password for "Mail"
4. Use 16-character password as `EMAIL_PASS`

### MongoDB Atlas Setup

1. Create free cluster on mongodb.com/atlas
2. Add database user
3. Whitelist IP: `0.0.0.0/0` for production
4. Copy connection string to `MONGO_URI`

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Shikhar Mishra** — Full-Stack Developer & AI Enthusiast

[![GitHub](https://img.shields.io/badge/GitHub-ShikharMishra9161-black?style=flat&logo=github)](https://github.com/ShikharMishra9161)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat&logo=linkedin)](https://linkedin.com/in/shikhar-mishra-480171294/)

---

<div align="center">
  <p>Built with ❤️ using React, Node.js, and Google Gemini</p>
  <p>⭐ Star this repo if you found it helpful!</p>
</div>

