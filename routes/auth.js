import express from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";

import {
  registerController,
  loginController,
  refreshTokenController,
  logoutController,
  meController
} from "../controllers/authController.js";

const router = express.Router();

// Bruteforce limiter for login route
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: "Too many login attempts from this IP, please try later" }
});

// register
router.post("/register", [
  body("email").isEmail(),
  body("password").isLength({ min: 8 }),
  body("name").optional().isLength({ min: 2 })
], registerController);

// login
router.post("/login", loginLimiter, [
  body("email").isEmail(),
  body("password").isString().notEmpty()
], loginController);


// refresh token (uses cookie)
router.post("/refresh", refreshTokenController);

// logout
router.post("/logout", logoutController);

// get current user
router.get("/me", meController);

export default router;
