const Tesseract = require("tesseract.js");
const sharp     = require("sharp");

/**
 * Preprocess image buffer for better OCR accuracy
 * - Convert to grayscale
 * - Increase contrast
 * - Remove noise
 */
async function preprocessImage(buffer) {
  return await sharp(buffer)
    .grayscale()                    // grayscale improves OCR
    .normalize()                    // auto contrast
    .sharpen()                      // sharpen edges
    .toBuffer();
}

/**
 * Extract text from image buffer using Tesseract
 * Supports: JPG, PNG, WEBP, BMP, TIFF
 */
async function extractTextFromImage(buffer, _mimetype) {
  try {
    // Preprocess for better accuracy
    const processed = await preprocessImage(buffer);

    const { data: { text, confidence } } = await Tesseract.recognize(
      processed,
      "eng", // language — add "hin" for Hindi support
      {
        logger: () => {}, // suppress progress logs
      }
    );

    const cleanText = text
      .replace(/\f/g, "\n")          // form feeds to newlines
      .replace(/\r\n/g, "\n")        // normalize line endings
      .replace(/\n{3,}/g, "\n\n")    // max 2 consecutive newlines
      .trim();

    return {
      text:       cleanText,
      confidence: Math.round(confidence), // 0-100%
      wordCount:  cleanText.split(/\s+/).filter(Boolean).length,
    };

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(`OCR failed: ${err.message}`, { cause: err });
  }
}

/**
 * Check if a file is an image (vs PDF)
 */
function isImage(mimetype) {
  return ["image/jpeg", "image/png", "image/webp",
          "image/bmp", "image/tiff"].includes(mimetype);
}

module.exports = { extractTextFromImage, isImage };