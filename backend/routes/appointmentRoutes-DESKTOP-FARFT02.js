const express = require("express");
const { createRecord, readCollection, writeCollection } = require("../fileDb");
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
    const students = readCollection("students");
    const teachers = readCollection("teachers");
    const appointments = readCollection("appointments");
    const marks = readCollection("marks");

    const student = students.find((item) => item._id === studentId);
    const teacher = teachers.find((item) => item._id === teacherId);

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found." });
    }

    const bookedAt = getCurrentIstDateTime();

    const existingAppointmentIndex = appointments.findIndex(
      (appointment) =>
        appointment.studentId === student._id &&
        appointment.teacherId === teacher._id &&
        appointment.reason === reason &&
        (appointment.remarks || "").trim() === normalizedRemarks
    );

    let appointment = null;

    if (existingAppointmentIndex !== -1) {
      appointment = {
        ...appointments[existingAppointmentIndex],
        studentName: student.fullName,
        classDiv: `${student.year} / ${student.division}`,
        teacherName: teacher.name,
        date: bookedAt,
        status: "Pending",
        remarks: normalizedRemarks,
        updatedAt: new Date().toISOString(),
      };
      appointments[existingAppointmentIndex] = appointment;
      writeCollection(
        "marks",
        marks.filter((record) => record.appointmentId !== appointment._id)
      );
    } else {
      appointment = createRecord({
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
      appointments.push(appointment);
    }
    writeCollection("appointments", appointments);

    res.status(existingAppointmentIndex !== -1 ? 200 : 201).json({
      message: existingAppointmentIndex !== -1
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

    const appointments = readCollection("appointments")
      .filter((appointment) => {
        if (filter.teacherName && !filter.teacherName.test(appointment.teacherName)) {
          return false;
        }

        if (filter.studentName && !filter.studentName.test(appointment.studentName)) {
          return false;
        }

        if (filter.teacherId && appointment.teacherId !== filter.teacherId) {
          return false;
        }

        if (filter.studentId && appointment.studentId !== filter.studentId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
