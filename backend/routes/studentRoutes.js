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
    const databaseUnavailable = isDatabaseUnavailable(error);
    res.status(databaseUnavailable ? 503 : 400).json({
      message: databaseUnavailable
        ? "Database is temporarily unavailable. Please try again shortly."
        : error.message,
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
    res.status(databaseUnavailable ? 503 : 500).json({
      message: databaseUnavailable
        ? "Database is temporarily unavailable. Please try again shortly."
        : error.message,
    });
  }
});

module.exports = router;
