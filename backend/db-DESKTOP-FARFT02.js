const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/teacher-slot-booking";

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    console.warn("MongoDB connection failed:", error.message);
    console.warn("Falling back to local file storage in backend/data.");
    return false;
  }
}

module.exports = connectDB;
