const express  = require("express");
const multer   = require("multer");
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const auth     = require("../middleware/auth");
const genAI    = require("../config/gemini");
const Document = require("../models/Document");
const Subject  = require("../models/Subject");
const { awardXP }                       = require("./xpRoutes");
const { chunkText, findRelevantChunks } = require("../utils/chunker");
const { extractTextFromImage, isImage } = require("../utils/ocr"); // ← new

const router = express.Router();

// ── Multer — accept PDF + images ──────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg", "image/png",
      "image/webp", "image/bmp", "image/tiff",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed"), false);
    }
  },
});

// ── Upload + Process (PDF or Image) ──────────────────────────────────
router.post("/upload", auth, upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { subjectName } = req.body;
    let rawText = "";
    let totalPages = 1;
    let extractionMethod = "pdf";

    // ── Route 1: Image → OCR ─────────────────────────────────────
    if (isImage(req.file.mimetype)) {
      extractionMethod = "ocr";
      console.log(`🔍 Running OCR on ${req.file.originalname}…`);

      const ocrResult = await extractTextFromImage(
        req.file.buffer,
        req.file.mimetype
      );

      if (!ocrResult.text || ocrResult.text.length < 50) {
        return res.status(400).json({
          message: `OCR extracted very little text (confidence: ${ocrResult.confidence}%). Try a clearer image.`,
        });
      }

      rawText = ocrResult.text;
      console.log(`✅ OCR done — ${ocrResult.wordCount} words, ${ocrResult.confidence}% confidence`);

    // ── Route 2: PDF → pdf-parse ──────────────────────────────────
    } else {
      const pdfData = await pdfParse(req.file.buffer, { verbosityLevel: 0 });
      rawText    = pdfData.text;
      totalPages = pdfData.numpages;

      if (!rawText || rawText.trim().length < 100) {
        return res.status(400).json({
          message: "PDF appears empty or image-based. Try uploading the page as an image (JPG/PNG) for OCR.",
        });
      }
    }

    // ── Chunk + Save (same for both routes) ──────────────────────
    const textChunks = chunkText(rawText, 600, 120);

    if (textChunks.length === 0) {
      return res.status(400).json({ message: "Could not extract usable text." });
    }

    const document = new Document({
      userId:      req.user,
      filename:    req.file.originalname,
      subject:     subjectName || "General",
      totalPages,
      totalChunks: textChunks.length,
      wordCount:   rawText.split(/\s+/).filter(Boolean).length,
      chunks:      textChunks.map((text, i) => ({ text, chunkIndex: i })),
    });

    await document.save();

    const xpResult = await awardXP(req.user, "summarize_notes");

    res.status(201).json({
      message:          `${extractionMethod === "ocr" ? "Image scanned" : "PDF processed"} successfully`,
      documentId:       document._id,
      filename:         document.filename,
      subject:          document.subject,
      totalPages:       document.totalPages,
      totalChunks:      document.totalChunks,
      wordCount:        document.wordCount,
      extractionMethod, // "pdf" or "ocr"
      xp:               xpResult,
    });

  } catch (error) {
    console.error("Upload error:", error);
    if (error.message.includes("Only PDF")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error processing file", error: error.message });
  }
});

// ── Ask question (unchanged) ──────────────────────────────────────────
router.post("/ask", auth, async (req, res) => {
  try {
    const { documentId, question, history = [] } = req.body;

    if (!question?.trim()) return res.status(400).json({ message: "Question is required" });
    if (!documentId)        return res.status(400).json({ message: "Document ID is required" });

    const document = await Document.findOne({ _id: documentId, userId: req.user });
    if (!document) return res.status(404).json({ message: "Document not found" });

    const relevantChunks = findRelevantChunks(question, document.chunks, 5);
    const chunksToUse    = relevantChunks.length > 0
      ? relevantChunks
      : document.chunks.slice(0, 3).map(c => c.toObject());

    const context = chunksToUse.map((c, i) => `[Section ${i + 1}]\n${c.text}`).join("\n\n");

    const prompt = `You are an AI assistant helping a student understand their study material.

DOCUMENT: "${document.filename}"
SUBJECT: ${document.subject}

RELEVANT SECTIONS:
${context}

CONVERSATION:
${history.slice(-4).map(h => `${h.role === "user" ? "Student" : "AI"}: ${h.text}`).join("\n")}

QUESTION: ${question}

Answer ONLY from the document. If not found, say so clearly.`;

    const response = await genAI.models.generateContent({
      model:    "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      answer:       response.text.trim(),
      chunksUsed:   chunksToUse.length,
      documentName: document.filename,
    });

  } catch (error) {
    console.error("RAG query error:", error);
    res.status(500).json({ message: "Error getting answer", error: error.message });
  }
});

// ── Get documents (unchanged) ─────────────────────────────────────────
router.get("/documents", auth, async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.user })
      .select("-chunks")
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching documents", error });
  }
});

// ── Delete document (unchanged) ───────────────────────────────────────
router.delete("/documents/:id", auth, async (req, res) => {
  try {
    await Document.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting document", error });
  }
});

module.exports = router;