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
const mongoose = require("mongoose");
const Marks = require("../models/Marks");
const Appointment = require("../models/Appointment");
const Teacher = require("../models/Teacher");
const Notification = require("../models/Notification");
const { createMarksReportWorkbook } = require("../services/marksExportService");


const router = express.Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getTeacherScopedMarks(teacherId, studentName = "") {
  if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
    throw createHttpError(400, "A valid teacher ID is required to query marks.");
  }

  const teacher = await Teacher.findById(teacherId).select("_id name subject").lean();
  if (!teacher) {
    throw createHttpError(404, "Teacher not found.");
  }

  // Subject belongs to the teacher record. The appointment's teacherId is the
  // reliable relationship between a marks record and its assigned subject.
  if (!String(teacher.subject || "").trim()) {
    return [];
  }

  const appointments = await Appointment.find({ teacherId: teacher._id })
    .select("_id")
    .lean();
  const appointmentIds = appointments.map(({ _id }) => _id);

  if (!appointmentIds.length) {
    return [];
  }

  const filter = { appointmentId: { $in: appointmentIds } };
  const normalizedStudentName = String(studentName || "").trim();
  if (normalizedStudentName) {
    filter.studentName = new RegExp(escapeRegex(normalizedStudentName), "i");
  }

  const records = await Marks.find(filter).sort({ checkedDate: -1 }).lean();
  return records.map((record) => ({
    ...record,
    teacherName: teacher.name,
    subject: teacher.subject,
  }));
}

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

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
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

    appointment.status = "Completed";
    await appointment.save();
    if (appointment.studentId) {
      await Notification.create({
        recipientId: appointment.studentId,
        recipientRole: "student",
        type: "appointment_completed",
        relatedId: appointment._id,
        message: `Your ${appointment.reason} request with ${appointment.teacherName} has been completed.`,
      });
    }

    res.status(201).json({
      ...marks.toObject(),
      appointment,
      message: "Marks saved and appointment status updated successfully.",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

async function exportMarksReport(req, res) {
  try {
    const { teacherId, studentName } = req.query;
    const records = await getTeacherScopedMarks(teacherId, studentName);

    if (!records.length) {
      return res.status(404).json({ message: "No marks records found for export." });
    }

    const { buffer, columns, fileName, skippedRemarks } =
      await createMarksReportWorkbook(records);

    if (skippedRemarks.length) {
      console.warn(
        `Marks summary omitted ${skippedRemarks.length} record(s) with unparseable remarks; they remain in Report Details.`
      );
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.end(Buffer.from(buffer));
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
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
    const { teacherId, studentName } = req.query;
    const records = await getTeacherScopedMarks(teacherId, studentName);
    res.json(records);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
