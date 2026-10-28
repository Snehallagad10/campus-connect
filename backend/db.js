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

let connectionPromise = null;

const safeErrorMessage = (error) =>
  String(error?.message || error).replace(
    /(mongodb(?:\+srv)?:\/\/)[^\s/@]+@/gi,
    "$1[REDACTED]@"
  );

const isDatabaseUnavailable = (error) => {
  const networkFailure =
    /buffering timed out|server selection timed out|MongoNetwork|ECONNRESET|ECONNREFUSED|ENOTFOUND/i.test(
      `${error?.name || ""} ${error?.message || ""}`
    );

  return mongoose.connection.readyState !== 1 || networkFailure;
};

async function connectDB() {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    const error = new Error("MONGO_URI is not configured.");
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  const attempt = mongoose
    .connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
      console.info("MongoDB connected successfully.");
      return mongoose.connection;
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", {
        name: error.name,
        code: error.code,
        message: safeErrorMessage(error),
      });
      throw error;
    })
    .finally(() => {
      if (connectionPromise === attempt) connectionPromise = null;
    });

  connectionPromise = attempt;
  return attempt;
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection disconnected.");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", {
    name: error.name,
    code: error.code,
    message: safeErrorMessage(error),
  });
});

module.exports = connectDB;
module.exports.isDatabaseUnavailable = isDatabaseUnavailable;
