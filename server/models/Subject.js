const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject:  { type: String, required: true },
  chapters: [{ type: String }],
}, { timestamps: true });

subjectSchema.index({ userId: 1 });
subjectSchema.index({ userId: 1, subject: 1 });

module.exports = mongoose.model("Subject", subjectSchema);