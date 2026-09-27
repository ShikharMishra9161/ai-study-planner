const express = require("express");
const router = express.Router();

router.post("/generate-plan", async (req, res) => {
  try {
    const { _subject, _days, _dailyHours, _level } = req.body;

    // AI logic will go here

    res.json({ message: "AI route working" });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;