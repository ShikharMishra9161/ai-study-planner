const express    = require("express");
const multer     = require("multer");
const pdfParse   = require("pdf-parse/lib/pdf-parse.js");
const auth       = require("../middleware/auth");
const genAI      = require("../config/gemini");
const Document   = require("../models/Document");
const Subject    = require("../models/Subject");
const { awardXP }           = require("./xpRoutes");
const { chunkText, findRelevantChunks } = require("../utils/chunker");

const router = express.Router();

// ── Multer config — memory storage (no disk writes) ───────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// ── Upload + Process PDF ──────────────────────────────────────────────
router.post("/upload", auth, upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }

    const { subjectName } = req.body;

    // Parse PDF
    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text;

    if (!rawText || rawText.trim().length < 100) {
      return res.status(400).json({
        message: "PDF appears to be empty or contains only images. Please upload a text-based PDF.",
      });
    }

    // Chunk the text
    const textChunks = chunkText(rawText, 600, 120);

    if (textChunks.length === 0) {
      return res.status(400).json({ message: "Could not extract text from this PDF." });
    }

    // Save to MongoDB
    const document = new Document({
      userId:      req.user,
      filename:    req.file.originalname,
      subject:     subjectName || "General",
      totalPages:  pdfData.numpages,
      totalChunks: textChunks.length,
      wordCount:   rawText.split(/\s+/).length,
      chunks:      textChunks.map((text, i) => ({ text, chunkIndex: i })),
    });

    await document.save();

    // Award XP for uploading notes
    const xpResult = await awardXP(req.user, "summarize_notes");

    res.status(201).json({
      message:     "PDF processed successfully",
      documentId:  document._id,
      filename:    document.filename,
      subject:     document.subject,
      totalPages:  document.totalPages,
      totalChunks: document.totalChunks,
      wordCount:   document.wordCount,
      xp:          xpResult,
    });

  } catch (error) {
    console.error("PDF upload error:", error);
    if (error.message === "Only PDF files are allowed") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error processing PDF", error: error.message });
  }
});

// ── Ask a question about a document (RAG) ────────────────────────────
router.post("/ask", auth, async (req, res) => {
  try {
    const { documentId, question, history = [] } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ message: "Question is required" });
    }

    if (!documentId) {
      return res.status(400).json({ message: "Document ID is required" });
    }

    // Fetch document with chunks
    const document = await Document.findOne({ _id: documentId, userId: req.user });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Find relevant chunks using keyword matching
    const relevantChunks = findRelevantChunks(question, document.chunks, 5);

    // If no relevant chunks found, still try to answer with top chunks
    const chunksToUse = relevantChunks.length > 0
      ? relevantChunks
      : document.chunks.slice(0, 3).map(c => c.toObject());

    const context = chunksToUse.map((c, i) => `[Section ${i + 1}]\n${c.text}`).join("\n\n");

    // Build RAG prompt
    const ragPrompt = `You are an AI assistant helping a student understand their study notes.

DOCUMENT: "${document.filename}" (${document.totalPages} pages)
SUBJECT: ${document.subject}

RELEVANT SECTIONS FROM THE DOCUMENT:
${context}

CONVERSATION HISTORY:
${history.slice(-4).map(h => `${h.role === "user" ? "Student" : "AI"}: ${h.text}`).join("\n")}

STUDENT'S QUESTION: ${question}

INSTRUCTIONS:
- Answer ONLY based on the document content provided above
- If the answer is not in the provided sections, say "I couldn't find that in your notes"
- Quote specific parts of the notes when helpful
- Keep the answer clear and student-friendly
- If the student asks to explain something, use examples from the document`;

    const response = await genAI.models.generateContent({
      model:    "gemini-2.5-flash",
      contents: ragPrompt,
    });

    const answer = response.text.trim();

    res.json({
      answer,
      chunksUsed:   chunksToUse.length,
      documentName: document.filename,
    });

  } catch (error) {
    console.error("RAG query error:", error);
    res.status(500).json({ message: "Error getting answer", error: error.message });
  }
});

// ── Get all documents for user ────────────────────────────────────────
router.get("/documents", auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user })
      .select("-chunks") // don't send chunks in list view
      .sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: "Error fetching documents", error });
  }
});

// ── Delete document ───────────────────────────────────────────────────
router.delete("/documents/:id", auth, async (req, res) => {
  try {
    await Document.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting document", error });
  }
});

module.exports = router;