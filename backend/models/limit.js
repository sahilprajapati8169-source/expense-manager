const mongoose = require("mongoose");

const limitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  totalLimit: {
    type: Number,
    default: 0
  },
  categoryLimits: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model("Limit", limitSchema);