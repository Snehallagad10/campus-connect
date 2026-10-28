const express = require("express");
const cors = require("cors");
const connectDB = require("./db");

const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const marksRoutes = require("./routes/marksRoutes");
const Marks = require("./models/Marks");
const { readCollection } = require("./fileDb");
const {
  buildMarksPivot,
  createMarksReportWorkbook,
} = require("./services/marksExportService");

const app = express();
const PORT = process.env.PORT || 5000;
const PRODUCTION_FRONTEND_ORIGIN =
  "https://campus-connect-gamma-taupe.vercel.app";
const PREVIEW_FRONTEND_HOST = /^campus-connect(?:-[a-z0-9-]+)?\.vercel\.app$/i;

const allowedFrontendOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (origin === PRODUCTION_FRONTEND_ORIGIN || allowedFrontendOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    return url.protocol === "https:" && PREVIEW_FRONTEND_HOST.test(url.hostname);
  } catch {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

// cors() responds to OPTIONS preflight requests before they reach the API routes.
app.use(cors(corsOptions));

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Teacher Slot Booking & Marks Management API",
    status: "running",
  });
});

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (_error) {
    res.status(503).json({
      message: "Database is temporarily unavailable. Please try again shortly.",
    });
  }
});

app.get("/export-marks", async (_req, res) => {
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
});

app.use("/teacher", teacherRoutes);
app.use("/student", studentRoutes);
app.use("/appointment", appointmentRoutes);
app.use("/marks", marksRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    message: "Something went wrong on the server.",
  });
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
