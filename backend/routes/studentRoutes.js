const express = require("express");
const crypto = require("crypto");
const Student = require("../models/Student");
const { isDatabaseUnavailable } = require("../db");

const router = express.Router();

const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

const sanitizeStudent = (student) => ({
  id: student._id,
  fullName: student.fullName,
  email: student.email,
  year: student.year,
  division: student.division,
});

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, year, division } = req.body;

    if (![fullName, email, year, division].every((value) => typeof value === "string" && value.trim()) ||
        typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ message: "Complete all required student fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({ message: "Student already registered." });
    }

    const student = await Student.create({
      fullName,
      email,
      password: hashPassword(password),
      year,
      division,
    });

    res.status(201).json({
      message: "Student registered successfully.",
      student: sanitizeStudent(student),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Student already registered." });
    }
    const databaseUnavailable = isDatabaseUnavailable(error);
    if (!databaseUnavailable) {
      console.error("Student registration failed:", { name: error.name, code: error.code });
    }
    res.status(databaseUnavailable ? 503 : 500).json({
      message: databaseUnavailable
        ? "Database is temporarily unavailable. Please try again shortly."
        : "Student registration could not be completed. Please try again.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });

    if (!student || student.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      message: "Login successful.",
      student: sanitizeStudent(student),
    });
  } catch (error) {
    const databaseUnavailable = isDatabaseUnavailable(error);
    if (!databaseUnavailable) {
      console.error("Student login failed:", { name: error.name, code: error.code });
    }
    res.status(databaseUnavailable ? 503 : 500).json({
      message: databaseUnavailable
        ? "Database is temporarily unavailable. Please try again shortly."
        : "Student login could not be completed. Please try again.",
    });
  }
});

module.exports = router;
