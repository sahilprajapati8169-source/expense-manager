const express = require("express");
const router = express.Router();
const Limit = require("../models/Limit");
const auth = require("../middleware/authMiddleware");

// 🔹 GET limits (auto load on login)
router.get("/", auth, async (req, res) => {
  try {
    const limit = await Limit.findOne({ user: req.user.id });
    res.json(limit || null);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 SAVE / UPDATE limits
router.post("/", auth, async (req, res) => {
  const { totalLimit, categoryLimits } = req.body;

  try {
    const updated = await Limit.findOneAndUpdate(
      { user: req.user.id },
      { totalLimit, categoryLimits },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to save limits" });
  }
});

module.exports = router;