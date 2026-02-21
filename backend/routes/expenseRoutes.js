const express = require("express");
const Expense = require("../models/Expense");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

// ADD EXPENSE with duplicate check
router.post("/", auth, async (req, res) => {
  try {
    const { title, amount, date, category } = req.body;
    
    // Basic validation
    if (!title || !amount || !date) {
      return res.status(400).json({ message: "Title, amount and date are required" });
    }
    
    // Optional: Check for recent duplicate (within 5 seconds)
    const recentDuplicate = await Expense.findOne({
      user: req.userId,
      title,
      amount,
      date,
      category,
      createdAt: { $gt: new Date(Date.now() - 5000) } // Last 5 seconds
    });
    
    if (recentDuplicate) {
      return res.status(400).json({ 
        message: "Duplicate expense detected. Please wait before adding again." 
      });
    }
    
    const expense = await Expense.create({
      ...req.body,
      user: req.userId
    });
    
    res.status(201).json(expense);
  } catch (err) {
    console.error("Add expense error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET ALL EXPENSES
router.get("/", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({
      user: req.userId,
      deleted: { $ne: true }
    }).sort({ createdAt: -1 });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET TRASH EXPENSES (🔥 ID SE UPAR)
router.get("/trash", auth, async (req, res) => {
  try {
    const trash = await Expense.find({
      user: req.userId,
      deleted: true
    }).sort({ deletedAt: -1 });

    res.json(trash);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🗑 CLEAR ALL EXPENSES → MOVE TO TRASH

router.put("/trash/all", auth, async (req, res) => {
  try {
    await Expense.updateMany(
      { user: req.userId, deleted: { $ne: true } },
      { 
        deleted: true,
        deletedAt: new Date()
      }
    );

    res.json({ message: "All expenses moved to trash" });
  } catch (err) {
    console.error("Clear all error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET SINGLE EXPENSE
router.get("/:id", auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ GET SINGLE EXPENSE (FOR EDIT)


// UPDATE EXPENSE
router.put("/:id", auth, async (req, res) => {
  try {
    const exp = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    
    if (!exp) {
      return res.status(404).json({ message: "Expense not found" });
    }
    
    res.json(exp);
  } catch (err) {
    console.error("Update expense error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE EXPENSE
router.delete("/:id", auth, async (req, res) => {
  try {
    const exp = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!exp) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Moved to trash" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});



// RESTORE EXPENSE
// ♻ RESTORE EXPENSE FROM TRASH
router.put("/:id/restore", auth, async (req, res) => {
  try {
    const exp = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, deleted: true },
      { deleted: false, deletedAt: null },
      { new: true }
    );

    if (!exp) {
      return res.status(404).json({ message: "Expense not found in trash" });
    }

    res.json({ message: "Expense restored", exp });
  } catch (err) {
    console.error("Restore error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;