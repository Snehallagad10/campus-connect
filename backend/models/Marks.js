const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    classDiv: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ["assignment", "practical", "mini project"],
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    grade: {
      type: String,
      default: "-",
    },
    feedback: {
      type: String,
      default: "",
      trim: true,
    },
    checkedDate: {
      type: Date,
      default: Date.now,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Marks", marksSchema);
