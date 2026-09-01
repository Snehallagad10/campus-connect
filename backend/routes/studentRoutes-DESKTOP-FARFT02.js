const express = require("express");
const crypto = require("crypto");
const { createRecord, readCollection, writeCollection } = require("../fileDb");

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
    const normalizedEmail = email.trim().toLowerCase();
    const students = readCollection("students");

    const existingStudent = students.find((student) => student.email === normalizedEmail);
    if (existingStudent) {
      return res.status(409).json({ message: "Student already registered." });
    }

    const student = createRecord({
      fullName,
      email: normalizedEmail,
      password: hashPassword(password),
      year,
      division,
    });
    students.push(student);
    writeCollection("students", students);

    res.status(201).json({
      message: "Student registered successfully.",
      student: sanitizeStudent(student),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const students = readCollection("students");
    const student = students.find((item) => item.email === normalizedEmail);

    if (!student || student.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      message: "Login successful.",
      student: sanitizeStudent(student),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
