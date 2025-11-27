import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ["CONFIRMED", "CANCELLED"], default: "CONFIRMED" }
}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);
