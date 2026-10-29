const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipientRole: { type: String, required: true, enum: ["student", "teacher"] },
    type: { type: String, required: true, enum: ["availability", "appointment", "appointment_completed"] },
    message: { type: String, required: true, trim: true },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, recipientRole: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
