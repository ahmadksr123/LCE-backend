import express from "express";
import User from "../models/User.js";
import Meeting from "../models/Meeting.js";
import ScanHistory from "../models/ScanHistory.js";

const router = express.Router();

router.post("/validate", async (req, res) => {
  try {
    const { cardID, room } = req.body;

    if (!cardID || !room) {
      return res.status(400).json({ allow: false, message: "cardID and room are required" });
    }

    // 1️⃣ Find the user by cardID
    const user = await User.findOne({ cardID });
    let allow = false;
    let message = "";

    if (!user) {
      message = "Card not registered";
    } else {
      const now = new Date();

      // 2️⃣ Check if the user has a scheduled meeting in that room right now
      const meeting = await Meeting.findOne({
        organizer: user._id,
        room: room,
        status: "scheduled",
        startTime: { $lte: now },
        endTime: { $gte: now }
      });

      if (meeting) {
        allow = true;
        message = "Door unlocked";
      } else {
        message = "No active meeting in this room";
      }
    }

    // 3️⃣ Save scan history
    await ScanHistory.create({
      userId: user?._id || null,
      cardID,
      roomId: room, // storing room name directly
      success: allow,
      message
    });

    return res.json({ allow, message });

  } catch (err) {
    console.error("Door validation error:", err);
    return res.status(500).json({ allow: false, message: "Server error" });
  }
});

export default router;
