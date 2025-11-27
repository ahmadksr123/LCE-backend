import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import meetingRoutes from "./routes/meeting.js";
import signupRouter from "./routes/signUp.js";


dotenv.config();
const app = express();

// Security middlewares
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS - tune this origin for production
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

// Global rate limiter (light)
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,            // limit requests per minute
  standardHeaders: true,
  legacyHeaders: false
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/signup", signupRouter);


app.get("/", (req, res) => res.json({ status: "ok" }));

// DB connect + start
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
    console.log("✅ Connected to MongoDB");
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`🚀 Server listening on ${port}`));
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
};

start();
