import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import connectDB from "./db/index.js";

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import questionRoutes from "./routes/question.routes.js";
import responseRoutes from "./routes/response.routes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.join(__dirname, "public");
const exportsDirectory = path.join(__dirname, "exports");
const getEnvOrigins = (value = "") =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [
  ...getEnvOrigins(process.env.FRONTEND_URL),
  ...getEnvOrigins(process.env.CORS_ORIGIN),
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
].filter((origin, index, origins) => origin && origins.indexOf(origin) === index);

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((cookies, entry) => {
    const [rawKey, ...rawValueParts] = entry.trim().split("=");
    if (!rawKey) {
      return cookies;
    }

    cookies[rawKey] = decodeURIComponent(rawValueParts.join("="));
    return cookies;
  }, {});

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
app.use(express.static(publicDirectory));
app.use("/exports", express.static(exportsDirectory));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true
  })
);

app.get("/", (req, res) => {
  return res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(publicDirectory, "login.html"));
});

app.get("/dashboard", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.adminToken;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.redirect("/login");
    }
  } catch (error) {
    return res.redirect("/login");
  }

  res.sendFile(path.join(publicDirectory, "dashboard.html"));
});

app.get("/reports", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.adminToken;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.redirect("/login");
    }
  } catch (error) {
    return res.redirect("/login");
  }

  res.sendFile(path.join(publicDirectory, "reports.html"));
});

app.get("/api-status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is working",
    dbStatus: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/responses", responseRoutes);

export { app };
