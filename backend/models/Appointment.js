const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
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
    teacherName: {
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
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Completed"],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
