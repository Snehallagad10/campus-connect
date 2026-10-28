const express = require("express");
const crypto = require("crypto");
const Teacher = require("../models/Teacher");
const { isDatabaseUnavailable } = require("../db");
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
  updatedAt: teacher.updatedAt,
});

const isValidTime = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || "").trim());

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;

    if (![name, email, subject].every((value) => typeof value === "string" && value.trim()) ||
        typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ message: "Complete all required teacher fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(409).json({ message: "Teacher already registered." });
    }

    const teacher = await Teacher.create({
      name,
      email,
      password: hashPassword(password),
      subject,
    });

    res.status(201).json({
      message: "Teacher registered successfully.",
      teacher: sanitizeTeacher(teacher),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Teacher already registered." });
    }
    const databaseUnavailable = isDatabaseUnavailable(error);
    if (!databaseUnavailable) {
      console.error("Teacher registration failed:", { name: error.name, code: error.code });
    }
    res.status(databaseUnavailable ? 503 : 500).json({
      message: databaseUnavailable
        ? "Database is temporarily unavailable. Please try again shortly."
        : "Teacher registration could not be completed. Please try again.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const teacher = await Teacher.findOne({ email });

    if (!teacher || teacher.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      message: "Login successful.",
      teacher: sanitizeTeacher(teacher),
    });
  } catch (error) {
    const databaseUnavailable = isDatabaseUnavailable(error);
    if (!databaseUnavailable) {
      console.error("Teacher login failed:", { name: error.name, code: error.code });
    }
    res.status(databaseUnavailable ? 503 : 500).json({
      message: databaseUnavailable
        ? "Database is temporarily unavailable. Please try again shortly."
        : "Teacher login could not be completed. Please try again.",
    });
  }
});

router.get("/all", async (_req, res) => {
  try {
    const teachers = await Teacher.find().sort({ name: 1 });
    res.json(teachers.map(sanitizeTeacher));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/availability/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { isAvailable, startTime, endTime, labNo, email } = req.body;

    if (isAvailable && (!isValidTime(startTime) || !isValidTime(endTime) || startTime === endTime)) {
      return res.status(400).json({
        message: "A valid From and To time are required. They must differ; overnight slots are supported.",
      });
    }

    let teacher = null;
    const update = {
      isAvailable,
      startTime: normalizeTimeInput(startTime),
      endTime: normalizeTimeInput(endTime),
      labNo,
    };

    if (teacherId && teacherId !== "lookup") {
      teacher = await Teacher.findByIdAndUpdate(teacherId, update, {
        new: true,
        runValidators: true,
      });
    }

    if (!teacher && email) {
      teacher = await Teacher.findOneAndUpdate({ email }, update, {
        new: true,
        runValidators: true,
      });
    }

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found." });
    }

    res.json({
      message: "Availability updated successfully.",
      teacher: sanitizeTeacher(teacher),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
