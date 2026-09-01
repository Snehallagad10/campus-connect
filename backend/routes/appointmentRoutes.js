const express = require("express");
const Appointment = require("../models/Appointment");
const Marks = require("../models/Marks");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const { getCurrentIstDateTime } = require("../utils/istTime");

const router = express.Router();

const buildAppointmentKey = (appointment) => {
  const studentKey = appointment.studentId?.toString?.() || appointment.studentName || "";
  const teacherKey = appointment.teacherId?.toString?.() || appointment.teacherName || "";
  const reasonKey = appointment.reason || "";
  const remarksKey = (appointment.remarks || "").trim().toLowerCase();

  return [studentKey, teacherKey, reasonKey, remarksKey].join("::");
};

router.post("/book", async (req, res) => {
  try {
    const { studentId, teacherId, reason, remarks } = req.body;
    const normalizedRemarks = (remarks || "").trim();

    const [student, teacher] = await Promise.all([
      Student.findById(studentId),
      Teacher.findById(teacherId),
    ]);

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found." });
    }

    const bookedAt = getCurrentIstDateTime();

    const existingAppointment = await Appointment.findOne({
      studentId: student._id,
      teacherId: teacher._id,
      reason,
      remarks: normalizedRemarks,
    });

    let appointment = existingAppointment;

    if (existingAppointment) {
      existingAppointment.studentName = student.fullName;
      existingAppointment.classDiv = `${student.year} / ${student.division}`;
      existingAppointment.teacherName = teacher.name;
      existingAppointment.date = bookedAt;
      existingAppointment.status = "Pending";
      existingAppointment.remarks = normalizedRemarks;
      appointment = await existingAppointment.save();

      await Marks.deleteOne({ appointmentId: appointment._id });
    } else {
      appointment = await Appointment.create({
        studentName: student.fullName,
        classDiv: `${student.year} / ${student.division}`,
        teacherName: teacher.name,
        reason,
        remarks: normalizedRemarks,
        date: bookedAt,
        status: "Pending",
        studentId: student._id,
        teacherId: teacher._id,
      });
    }

    res.status(existingAppointment ? 200 : 201).json({
      message: existingAppointment
        ? "Existing appointment updated to pending."
        : "Appointment booked successfully.",
      appointment,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { teacherName, studentName, teacherId, studentId } = req.query;
    const filter = {};

    if (teacherName) {
      filter.teacherName = new RegExp(teacherName, "i");
    }

    if (studentName) {
      filter.studentName = new RegExp(studentName, "i");
    }

    if (teacherId) {
      filter.teacherId = teacherId;
    }

    if (studentId) {
      filter.studentId = studentId;
    }

    const appointments = await Appointment.find(filter).sort({
      createdAt: -1,
    });

    const latestAppointments = [];
    const seenAppointments = new Set();

    for (const appointment of appointments) {
      const appointmentKey = buildAppointmentKey(appointment);

      if (seenAppointments.has(appointmentKey)) {
        continue;
      }

      seenAppointments.add(appointmentKey);
      latestAppointments.push(appointment);
    }

    res.json(latestAppointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
