const mongoose = require("mongoose");

const limitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    totalLimit: {
      type: Number,
      required: true
    },

    categoryLimits: {
      Food: { type: Number, default: 0 },
      Travel: { type: Number, default: 0 },
      Rent: { type: Number, default: 0 },
      Shopping: { type: Number, default: 0 },
      Bills: { type: Number, default: 0 },
      Others: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Limit", limitSchema);