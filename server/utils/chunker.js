/**
 * Splits text into overlapping chunks for better RAG context
 * Overlap ensures context isn't lost at chunk boundaries
 */
function chunkText(text, chunkSize = 500, overlap = 100) {
    // Clean the text
    const cleaned = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")  // max 2 consecutive newlines
      .replace(/\s+/g, " ")        // collapse multiple spaces
      .trim();
  
    if (cleaned.length === 0) return [];
  
    const chunks   = [];
    let   startIdx = 0;
  
    while (startIdx < cleaned.length) {
      let endIdx = startIdx + chunkSize;
  
      // Try to end at a sentence boundary (. ! ?) for cleaner chunks
      if (endIdx < cleaned.length) {
        const sentenceEnd = cleaned.lastIndexOf(".", endIdx);
        const exclamEnd   = cleaned.lastIndexOf("!", endIdx);
        const questionEnd = cleaned.lastIndexOf("?", endIdx);
        const bestEnd     = Math.max(sentenceEnd, exclamEnd, questionEnd);
  
        // Only use sentence boundary if it's not too far back
        if (bestEnd > startIdx + chunkSize * 0.5) {
          endIdx = bestEnd + 1;
        }
      }
  
      const chunk = cleaned.slice(startIdx, endIdx).trim();
      if (chunk.length > 50) { // skip tiny chunks
        chunks.push(chunk);
      }
  
      // Move forward with overlap
      startIdx = endIdx - overlap;
      if (startIdx <= 0) startIdx = endIdx;
    }
  
    return chunks;
  }
  
  /**
   * Find the most relevant chunks for a query using keyword matching
   * Simple but effective for a portfolio project
   * (Production would use vector embeddings)
   */
  function findRelevantChunks(query, chunks, topK = 5) {
    const queryWords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3); // ignore short words like "the", "is"
  
    // Score each chunk by keyword matches
    const scored = chunks.map((chunk, index) => {
      const chunkLower = chunk.text.toLowerCase();
      let score = 0;
  
      queryWords.forEach(word => {
        // Exact word match
        const regex = new RegExp(`\\b${word}\\b`, "g");
        const matches = chunkLower.match(regex);
        if (matches) score += matches.length * 2;
  
        // Partial match (word appears as part of another word)
        if (chunkLower.includes(word)) score += 1;
      });
  
      return { ...chunk.toObject(), index, score };
    });
  
    // Sort by score and return top K
    return scored
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
  
  module.exports = { chunkText, findRelevantChunks };