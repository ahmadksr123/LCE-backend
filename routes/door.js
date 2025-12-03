import express from "express";
import User from "../models/User.js";
import Meeting from "../models/Meeting.js";
import ScanHistory from "../models/ScanHistory.js";

const router = express.Router();

// ---------------------------
// ROOM MAPPING (ID → Name)
// ---------------------------
const ROOM_MAP = {
  1: "Room A",
  2: "Room B",
  3: "Room C",
  4: "Room D",
  5: "Room E",
  6: "Room F",
  7: "Room G",
  8: "Room H"
};

// Reverse (optional, if ever needed)
// const ROOM_NAME_TO_ID = Object.fromEntries(
//   Object.entries(ROOM_MAP).map(([id, name]) => [name, Number(id)])
// );

// URL:
// POST /door/validate/:cardID/:roomId
router.post("/validate/:cardID/:roomId", async (req, res) => {
  try {
    const { cardID, roomId } = req.params;

    // Convert room ID → Room Name
    const roomName = ROOM_MAP[roomId];

    if (!roomName) {
      return res.status(400).json({ allow: false, message: "Invalid room ID" });
    }

    // 1️⃣ Find user by cardID
    const user = await User.findOne({ cardID });
    let allow = false;
    let message = "";

    if (!user) {
      message = "Card not registered";
    } else {
      const now = new Date();

      // 2️⃣ Check meeting with internal roomName
      const meeting = await Meeting.findOne({
        organizer: user._id,
        room: roomName,
        status: "scheduled",
        startTime: { $lte: now },
        endTime: { $gte: now }
      });

      if (meeting) {
        allow = true;
        message = `Door unlocked for ${roomName}`;
      } else {
        message = `No active meeting in ${roomName}`;
      }
    }

    // 3️⃣ Save scan history
    await ScanHistory.create({
      userId: user?._id || null,
      cardID,
      roomId: roomName, // storing room name
      success: allow,
      message
    });

    return res.json({ allow, message, roomName });

  } catch (err) {
    console.error("Door validation error:", err);
    return res.status(500).json({ allow: false, message: "Server error" });
  }
});

export default router;
