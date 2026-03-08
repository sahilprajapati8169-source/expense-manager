require("dotenv").config();


const express = require("express");
const cors = require("cors");
const passport = require("./config/passport");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const limitRoutes = require("./routes/limitRoutes");

const app = express();

// middlewares
app.use(cors({
  origin: [
    "https://fluffy-peony-3a5444.netlify.app",
    "https://expense-manager-sigma-sandy.vercel.app"
  ],
  credentials: true
}));
app.use(express.json());

app.use(passport.initialize());

// DB CONNECT
connectDB();

// routes
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/limits", limitRoutes);

app.get("/", (req, res) => {
  res.send("Expense Manager Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

// redeploy trigger