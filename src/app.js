import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import connectDB from "./db/index.js";

import authRoutes from "./routes/auth.routes.js"
import questionRoutes from "./routes/question.routes.js"

const app = express();

// Database connection middleware for serverless
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal Server Error"
    });
  }
});

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is working 🚀",
    dbStatus: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/questions", questionRoutes);

export { app };