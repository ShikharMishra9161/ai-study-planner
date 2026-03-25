const express = require("express");
const Subject = require("../models/Subject");
const auth = require("../middleware/auth");

const router = express.Router();

// Add Subject
router.post("/", auth, async (req, res) => {
  try {
    const { subject, chapters } = req.body;

    const newSubject = new Subject({
      userId: req.user,
      subject,
      chapters,
    });

    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (error) {
    res.status(500).json({ message: "Error adding subject", error });
  }
});

// Get All Subjects (for logged-in user)
router.get("/", auth, async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user });
    res.json(subjects);
  } catch (error) {
    // BUG FIX: typo "sujects" → "subjects"
    res.status(500).json({ message: "Error fetching subjects", error });
  }
});

// Update Subject
router.put("/:id", auth, async (req, res) => {
  try {
    const updated = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Subject not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating subject", error });
  }
});

// Delete Subject
router.delete("/:id", auth, async (req, res) => {
  try {
    await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Subject deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting subject", error });
  }
});

module.exports = router;