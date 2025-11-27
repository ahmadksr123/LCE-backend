const express = require("express");
const initDB = require("../db");
const { validateBooking } = require("../utils/validators");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Get all bookings (Admin only)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const db = await initDB();
  const bookings = await db.all("SELECT * FROM bookings");
  res.json(bookings);
});

// Create a booking (User or Admin)
router.post("/", requireAuth, async (req, res) => {
  const error = validateBooking(req.body);
  if (error) return res.status(400).json({ error });

  const { room, start, end } = req.body;
  const created_by = req.user.username;

  const db = await initDB();

  const overlap = await db.get(
    "SELECT * FROM bookings WHERE room=? AND (start < ? AND end > ?)",
    [room, end, start]
  );
  if (overlap) return res.status(400).json({ error: "Room already booked" });

  const result = await db.run(
    "INSERT INTO bookings (room, start, end, created_by) VALUES (?, ?, ?, ?)",
    [room, start, end, created_by]
  );

  res.json({ id: result.lastID });
});

// Delete booking (Admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const db = await initDB();
  await db.run("DELETE FROM bookings WHERE id=?", [req.params.id]);
  res.json({ message: "Booking deleted" });
});

module.exports = router;
