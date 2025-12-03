import mongoose from "mongoose";

const scanHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  cardID: { type: String, required: true },
  roomId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  success: { type: Boolean, required: true },
  message: { type: String }
}, { timestamps: true });

export default mongoose.model("ScanHistory", scanHistorySchema);
