const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema({
  text:       { type: String, required: true },
  chunkIndex: { type: Number, required: true },
});

const documentSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename:  { type: String, required: true },
  subject:   { type: String, default: "General" },
  totalPages:{ type: Number, default: 0 },
  totalChunks:{ type: Number, default: 0 },
  wordCount: { type: Number, default: 0 },
  chunks:    [chunkSchema],
}, { timestamps: true });

documentSchema.index({ userId: 1 });

module.exports = mongoose.model("Document", documentSchema);