const express = require("express");
const crypto = require("crypto");
const { createRecord, readCollection, writeCollection } = require("../fileDb");
const { normalizeTimeInput } = require("../utils/istTime");

const router = express.Router();

const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

const sanitizeTeacher = (teacher) => ({
  id: teacher._id,
  name: teacher.name,
  email: teacher.email,
  subject: teacher.subject,
  isAvailable: teacher.isAvailable,
  startTime: teacher.startTime,
  endTime: teacher.endTime,
  labNo: teacher.labNo,
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const teachers = readCollection("teachers");

    const existingTeacher = teachers.find((teacher) => teacher.email === normalizedEmail);
    if (existingTeacher) {
      return res.status(409).json({ message: "Teacher already registered." });
    }

    const teacher = createRecord({
      name,
      email: normalizedEmail,
      password: hashPassword(password),
      subject,
      isAvailable: false,
      startTime: "",
      endTime: "",
      labNo: "",
    });
    teachers.push(teacher);
    writeCollection("teachers", teachers);

    res.status(201).json({
      message: "Teacher registered successfully.",
      teacher: sanitizeTeacher(teacher),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const teachers = readCollection("teachers");
    const teacher = teachers.find((item) => item.email === normalizedEmail);

    if (!teacher || teacher.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      message: "Login successful.",
      teacher: sanitizeTeacher(teacher),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/all", async (_req, res) => {
  try {
    const teachers = readCollection("teachers").sort((a, b) => a.name.localeCompare(b.name));
    res.json(teachers.map(sanitizeTeacher));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/availability/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { isAvailable, startTime, endTime, labNo, email } = req.body;
    const teachers = readCollection("teachers");
    let teacherIndex = -1;
    const update = {
      isAvailable,
      startTime: normalizeTimeInput(startTime),
      endTime: normalizeTimeInput(endTime),
      labNo,
    };

    if (teacherId && teacherId !== "lookup") {
      teacherIndex = teachers.findIndex((teacher) => teacher._id === teacherId);
    }

    if (teacherIndex === -1 && email) {
      teacherIndex = teachers.findIndex(
        (teacher) => teacher.email === email.trim().toLowerCase()
      );
    }

    if (teacherIndex === -1) {
      return res.status(404).json({ message: "Teacher not found." });
    }

    teachers[teacherIndex] = {
      ...teachers[teacherIndex],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    writeCollection("teachers", teachers);

    res.json({
      message: "Availability updated successfully.",
      teacher: sanitizeTeacher(teachers[teacherIndex]),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
