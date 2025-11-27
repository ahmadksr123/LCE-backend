import mongoose from "mongoose";
import validator from "validator";

const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  organization: { type: String, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "invalid email"]
  },
  cardID: { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "user" },
  isActive: { type: Boolean, default: true },

  // security metadata
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Number }, // timestamp in ms

}, { timestamps: true });

// instance methods
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementFailedLogins = async function() {
  const updates = { $inc: { failedLoginAttempts: 1 } };
  // lock after 5 attempts
  if ((this.failedLoginAttempts + 1) >= 115 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  await this.updateOne(updates);
};

userSchema.methods.resetFailedLogins = async function() {
  await this.updateOne({ $set: { failedLoginAttempts: 0, lockUntil: null } });
};

export default mongoose.model("User", userSchema);
