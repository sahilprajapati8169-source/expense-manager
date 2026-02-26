const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Limit = require("../models/limit");

// ✅ SAVE or UPDATE limits
router.post("/", auth, async (req, res) => {
  try {
    const { totalLimit, categoryLimits } = req.body;

    let limits = await Limit.findOne({ user: req.user.id });

    if (limits) {
      limits.totalLimit = totalLimit;
      limits.categoryLimits = categoryLimits;
    } else {
      limits = new Limit({
        user: req.user.id,
        totalLimit,
        categoryLimits
      });
    }

    await limits.save();
    res.json({ message: "Limits saved successfully", limits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save limits" });
  }
});

// ✅ GET limits (auto-load after login)
router.get("/", auth, async (req, res) => {
  try {
    const limits = await Limit.findOne({ user: req.user.id });
    res.json(limits || {});
  } catch (err) {
    res.status(500).json({ message: "Failed to load limits" });
  }
});

module.exports = router;