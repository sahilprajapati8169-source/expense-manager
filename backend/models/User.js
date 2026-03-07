const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    minlength: 8
  },

  mobile: {
    type: String,
    required: true,
    unique: true
  },

  country: {
    type: String
  },

  googleId: String,

  resetToken: String,
  resetTokenExpire: Date

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);