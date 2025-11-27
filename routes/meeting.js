// routes/meeting.js
import express from "express";
import Meeting from "../models/Meeting.js";

const router = express.Router();


// ✅ Create a meeting
router.post("/", async (req, res) => {
  try {
    const meeting = await Meeting.create(req.body);
    res.status(201).json(meeting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ✅ Get all meetings (with optional filters)
router.get("/", async (req, res) => {
  try {
    const { organizer, month } = req.query;
    let query = {};

    if (organizer) query.organizer = organizer;

    if (month) {
      const start = new Date(`${month}-01`); // e.g. 2025-10
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      query.startTime = { $gte: start, $lt: end };
    }

    const meetings = await Meeting.find(query).populate("organizer participants");
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Get a single meeting
router.get("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate("organizer participants");
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Update meeting
router.put("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    res.json(meeting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ✅ Delete meeting
router.delete("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    res.json({ message: "Meeting deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Get total meeting hours in a given month
router.get("/analytics/hours/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const meetings = await Meeting.find({ startTime: { $gte: start, $lt: end } });

    const totalMinutes = meetings.reduce((sum, m) => {
      const duration = (new Date(m.endTime) - new Date(m.startTime)) / (1000 * 60); // minutes
      return sum + duration;
    }, 0);

    res.json({
      year,
      month,
      totalHours: (totalMinutes / 60).toFixed(2),
      meetingCount: meetings.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
