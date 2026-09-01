// const express = require("express");
// const Marks = require("../models/Marks");
// const Appointment = require("../models/Appointment");

// const router = express.Router();

// router.post("/save", async (req, res) => {
//   try {
//     const {
//       appointmentId,
//       studentName,
//       classDiv,
//       reason,
//       remarks,
//       grade,
//       feedback,
//     } = req.body;

//     if (!appointmentId) {
//       return res.status(400).json({ message: "Appointment ID is required to update status." });
//     }

//     const marks = await Marks.findOneAndUpdate(
//       { appointmentId },
//       {
//         studentName,
//         classDiv,
//         reason,
//         remarks: remarks || "",
//         grade: grade || "-",
//         feedback: feedback || "",
//         checkedDate: new Date(),
//         appointmentId,
//       },
//       {
//         upsert: true,
//         new: true,
//         runValidators: true,
//       }
//     );

//     const appointment = await Appointment.findByIdAndUpdate(
//       appointmentId,
//       {
//         status: "Completed",
//       },
//       {
//         new: true,
//       }
//     );

//     if (!appointment) {
//       return res.status(404).json({ message: "Appointment not found." });
//     }

//     res.status(201).json({
//       ...marks.toObject(),
//       appointment,
//       message: "Marks saved and appointment status updated successfully.",
//     });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });

// router.get("/:studentName", async (req, res) => {
//   try {
//     const studentName = decodeURIComponent(req.params.studentName);
//     const records = await Marks.find({
//       studentName: new RegExp(`^${studentName}$`, "i"),
//     }).sort({ checkedDate: -1 });

//     res.json(records);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// router.get("/", async (req, res) => {
//   try {
//     const { studentName } = req.query;
//     const filter = studentName
//       ? { studentName: new RegExp(studentName, "i") }
//       : {};

//     const records = await Marks.find(filter).sort({ checkedDate: -1 });
//     res.json(records);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// module.exports = router;


const express = require("express");
const Marks = require("../models/Marks");
const Appointment = require("../models/Appointment");
const { readCollection } = require("../fileDb");
const {
  buildMarksPivot,
  createMarksReportWorkbook,
} = require("../services/marksExportService");

// ✅ ADDED: Excel dependencies
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

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

    const marks = await Marks.findOneAndUpdate(
      { appointmentId },
      {
        studentName,
        classDiv,
        reason,
        remarks: remarks || "",
        grade: grade || "-",
        feedback: feedback || "",
        checkedDate: new Date(),
        appointmentId,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        status: "Completed",
      },
      {
        new: true,
      }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    // ================== ✅ ADDED EXCEL LOGIC ==================
    try {
      const filePath = path.join(__dirname, "../marks.xlsx");

      let existingData = [];

      if (fs.existsSync(filePath)) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        existingData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      }

      existingData.push({
        studentName,
        classDiv,
        reason,
        remarks: remarks || "",
        grade: grade || "-",
        feedback: feedback || "",
        checkedDate: new Date().toLocaleString(),
      });

      const worksheet = XLSX.utils.json_to_sheet(existingData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Marks");

      XLSX.writeFile(workbook, filePath);
    } catch (excelError) {
      console.error("Excel write error:", excelError.message);
    }
    // ================== ✅ END ==================

    res.status(201).json({
      ...marks.toObject(),
      appointment,
      message: "Marks saved and appointment status updated successfully.",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

async function exportMarksReport(_req, res) {
  try {
    let records = await Marks.find({}).sort({ checkedDate: 1 }).lean();
    let pivot = buildMarksPivot(records);

    if (!pivot.columns.length) {
      const fallbackRecords = readCollection("marks").sort(
        (a, b) => new Date(a.checkedDate) - new Date(b.checkedDate)
      );
      const fallbackPivot = buildMarksPivot(fallbackRecords);

      if (fallbackPivot.columns.length) {
        records = fallbackRecords;
        pivot = fallbackPivot;
      }
    }

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
    const records = await Marks.find({
      studentName: new RegExp(`^${studentName}$`, "i"),
    }).sort({ checkedDate: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { studentName } = req.query;
    const filter = studentName
      ? { studentName: new RegExp(studentName, "i") }
      : {};

    const records = await Marks.find(filter).sort({ checkedDate: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
