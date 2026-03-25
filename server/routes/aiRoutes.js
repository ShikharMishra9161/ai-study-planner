const express = require("express");
const router = express.Router();

router.post("/generate-plan", async (req, res) => {
  try {
    const { subject, days, dailyHours, level } = req.body;

    // AI logic will go here

    res.json({ message: "AI route working" });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;