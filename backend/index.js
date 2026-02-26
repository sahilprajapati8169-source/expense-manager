require("dotenv").config();


const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const limitRoutes = require("./routes/limitRoutes");

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

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