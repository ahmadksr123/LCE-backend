import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Middleware to authenticate and attach user from JWT token
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from headers (Authorization: Bearer <token>)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Auth token:", token);

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET); // make sure JWT_ACCESS_SECRET is in your .env
    console.log("Decoded token:", decoded);
    // Attach user to request
    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export default authMiddleware;
