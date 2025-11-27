//generate the code for a sign up route in express js with the following requirements
//1. the route should be a post request to /signup
//2. the route should accept a json body with the following fields: name, email, password
//3. the route should validate that the email is in a valid email format and that the password is at least 8 characters long
//4. the route should check if a user with the given email already exists in the database, if so return a 400 status code with an error message
//5. if the user does not exist, hash the password using bcrypt and create a new user in the database with the given name, email and hashed password
//6. return a 201 status code with a success message

import express from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const signupRouter = express.Router();

// POST /signup
// ✅ Only admin can create new users
signupRouter.post(
  "/create",
  authMiddleware, // attach user from token
  [
    body("name").isLength({ min: 2 }).withMessage("Name must be at least 2 characters long"),
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
    body("cardID").optional().isString(),
    body("organization").optional().isString(),
    body("role").optional().isIn(["Admin", "User"]).withMessage("Role must be either 'Admin' or 'User'"),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, cardID, organization, role, isActive } = req.body;

    try {
      // ✅ Check if the user making the request is admin

      if (!req.user || (req.user.role !== "Admin" && req.user.role !== "admin" && req.user.role !== "Owner" && req.user.role !== "owner")) {
        return res.status(403).json({ error: "Only admins & Owners can create new users" });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create new user
      const newUser = new User({
        name,
        email,
        passwordHash,
        cardID,
        organization,
        role: role || "User",
        isActive: isActive !== undefined ? isActive : true,
      });

      await newUser.save();
      res.status(201).json({ message: "User registered successfully", userId: newUser._id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// get all users
signupRouter.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// delete user by id
signupRouter.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
signupRouter.put(
  "/:id",
  authMiddleware,
  [
    body("name").optional().isLength({ min: 2 }).withMessage("Name must be at least 2 characters long"),
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("password").optional().isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
    body("currentPassword").optional().isString().withMessage("Current password must be a string"),
    body("cardID").optional().isString(),
    body("organization").optional().isString(),
    body("role").optional().isIn(["Admin", "User"]).withMessage("Role must be either 'Admin' or 'User'"),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, currentPassword, cardID, organization, role, isActive } = req.body;

    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check for email uniqueness if updating
      if (email && email !== user.email) {
        const existingUser = await User.find({ email });
        if (existingUser.length > 0) {
          return res.status(400).json({ error: "User with this email already exists" });
        }
      }

      const isAdminOrOwner = ["Admin", "Owner"].includes(req.user.role);

      // Password update logic
      if (password) {
        if (!isAdminOrOwner) {
          // Non-admin must provide current password
          if (!currentPassword) {
            return res.status(400).json({ error: "Current password is required to update password" });
          }
          const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
          if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });
        }
        // Hash and save new password
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(password, salt);
      }

      // Update other fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (cardID) user.cardID = cardID;
      if (organization) user.organization = organization;
      if (role && isAdminOrOwner) user.role = role; // Only admin/owner can change roles
      if (isActive !== undefined && isAdminOrOwner) user.isActive = isActive; // Only admin/owner can change active status

      await user.save();
      res.json({ message: "User updated successfully" });
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

//if admin or owner is reseting password of another user, they don't need to provide current password and it can update the password of htat user by taking gmail
signupRouter.put(
  "/:id/reset-password",
  authMiddleware,
  [
    body("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { newPassword } = req.body;
    console.log("newPassword:", newPassword);


    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      console.log("User found for password reset:", user.email);

      const isAdminOrOwner = ["Admin", "Owner"].includes(req.user.role);
      if (!isAdminOrOwner) {
        return res.status(403).json({ error: "Only admins & Owners can reset other users' passwords" });
      }

      // Hash and save new password
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);

      await user.save();
      console.log("Password reset successfully");
      res.json({ message: "Password resetting successfully" });
    } catch (err) {
      console.error("Error resetting password:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);  
export default signupRouter;