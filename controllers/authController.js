import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXPIRY || "7d";

function createAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}
function createRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXP });
}

// helper: set refresh token as secure HTTP-only cookie
function sendRefreshToken(res, token) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  res.cookie("jid", token, cookieOptions);
}

export const registerController = async (req, res) => {
  try {
    // validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, name } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    // password policy (additional)
    const pwOk = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(password);
    if (!pwOk) return res.status(400).json({ error: "Password must be at least 8 chars, include upper, lower, and number" });

    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ email, name, passwordHash });
    const accessToken = createAccessToken({ sub: user.id, role: user.role });
    const refreshToken = createRefreshToken({ sub: user.id });

    sendRefreshToken(res, refreshToken);
    return res.status(201).json({ accessToken, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const loginController = async (req, res) => {
  try {
    // validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    console.log(email, password);
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // // check lock
    // if (user.isLocked()) {
    //   return res.status(423).json({ error: "Account locked due to multiple failed login attempts. Try again later." });
    // }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await user.incrementFailedLogins();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // success -> reset failed counters
    await user.resetFailedLogins();

    const accessToken = createAccessToken({ sub: user.id, role: user.role });
    const refreshToken = createRefreshToken({ sub: user.id });

    // Optionally rotate refresh tokens for extra security:
    // - store a fingerprint or jti in DB to validate refresh token (not included here to keep it simpler)

    sendRefreshToken(res, refreshToken);
    return res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const refreshTokenController = async (req, res) => {
  try {
    const token = req.cookies.jid;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "User not found" });

    // Optionally check token revocation / rotation here

    const newAccess = createAccessToken({ sub: user.id, role: user.role });
    const newRefresh = createRefreshToken({ sub: user.id });

    sendRefreshToken(res, newRefresh);
    return res.json({ accessToken: newAccess, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("refresh error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const logoutController = async (req, res) => {
  // Clear cookie
  res.clearCookie("jid", { path: "/api/auth/refresh" });
  return res.json({ ok: true });
};

export const meController = async (req, res) => {
  // Optionally authenticate via bearer token here or decode access token in middleware.
  // For brevity, we will check Authorization header (Bearer token)
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing authorization" });

    const token = auth.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Missing token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await User.findById(payload.sub).select("-passwordHash -failedLoginAttempts -lockUntil");
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ user });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
