const mongoose = require("mongoose"); // ✅ YE LINE MISSING THI

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    notes: String,

    // 🗑 Trash fields
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },

    // 👤 user reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true } // ⏱ createdAt, updatedAt
);

module.exports = mongoose.model("Expense", expenseSchema);
