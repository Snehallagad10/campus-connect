const express = require("express");
const { createRecord, readCollection, writeCollection } = require("../fileDb");
const { createMarksReportWorkbook } = require("../services/marksExportService");

const router = express.Router();

router.post("/save", async (req, res) => {
  try {
    const {
      appointmentId,
      studentName,
      classDiv,
      reason,
      remarks,
      grade,
      feedback,
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: "Appointment ID is required to update status." });
    }
    const marksCollection = readCollection("marks");
    const appointments = readCollection("appointments");
    const checkedDate = new Date().toISOString();

    const existingMarksIndex = marksCollection.findIndex(
      (record) => record.appointmentId === appointmentId
    );

    let marks = null;

    if (existingMarksIndex !== -1) {
      marks = {
        ...marksCollection[existingMarksIndex],
        studentName,
        classDiv,
        reason,
        remarks: remarks || "",
        grade: grade || "-",
        feedback: feedback || "",
        checkedDate,
        updatedAt: checkedDate,
      };
      marksCollection[existingMarksIndex] = marks;
    } else {
      marks = createRecord({
        studentName,
        classDiv,
        reason,
        remarks: remarks || "",
        grade: grade || "-",
        feedback: feedback || "",
        checkedDate,
        appointmentId,
      });
      marksCollection.push(marks);
    }
    writeCollection("marks", marksCollection);

    const appointmentIndex = appointments.findIndex(
      (appointmentItem) => appointmentItem._id === appointmentId
    );

    if (appointmentIndex === -1) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    appointments[appointmentIndex] = {
      ...appointments[appointmentIndex],
      status: "Completed",
      updatedAt: checkedDate,
    };
    writeCollection("appointments", appointments);

    res.status(201).json({
      ...marks,
      appointment: appointments[appointmentIndex],
      message: "Marks saved and appointment status updated successfully.",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

async function exportMarksReport(_req, res) {
  try {
    const records = readCollection("marks").sort(
      (a, b) => new Date(a.checkedDate) - new Date(b.checkedDate)
    );
    const { buffer, columns, fileName, skippedRemarks } =
      await createMarksReportWorkbook(records);

    console.log("Fetched records:", records.length);
    console.log("Parsed columns:", columns);

    if (skippedRemarks.length) {
      console.warn(
        `Marks export skipped ${skippedRemarks.length} record(s) with unparseable remarks.`
      );
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.end(Buffer.from(buffer));
  } catch (error) {
    console.error("Marks export failed:", error);
    res.status(500).json({ message: "Unable to export marks report." });
  }
}

router.get("/export/excel", exportMarksReport);
router.get("/export-marks", exportMarksReport);

router.get("/:studentName", async (req, res) => {
  try {
    const studentName = decodeURIComponent(req.params.studentName);
    const records = readCollection("marks")
      .filter((record) => new RegExp(`^${studentName}$`, "i").test(record.studentName))
      .sort((a, b) => new Date(b.checkedDate) - new Date(a.checkedDate));

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { studentName } = req.query;
    const records = readCollection("marks")
      .filter((record) => {
        if (!studentName) {
          return true;
        }

        return new RegExp(studentName, "i").test(record.studentName);
      })
      .sort((a, b) => new Date(b.checkedDate) - new Date(a.checkedDate));
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
