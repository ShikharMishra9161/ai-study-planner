const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options:  [{ type: String, required: true }], // 4 options
  correct:  { type: Number, required: true },   // index of correct option (0-3)
});

const quizSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  questions: [questionSchema],
  score:     { type: Number, default: null },   // null = not attempted yet
  total:     { type: Number, required: true },
  attempted: { type: Boolean, default: false },
  takenAt:   { type: Date, default: null },
}, { timestamps: true });

quizSchema.index({ userId: 1, createdAt: -1 });
quizSchema.index({ userId: 1, attempted: 1, takenAt: -1 });
quizSchema.index({ userId: 1, subjectId: 1 });

module.exports = mongoose.model("Quiz", quizSchema);