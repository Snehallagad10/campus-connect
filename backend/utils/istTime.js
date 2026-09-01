const IST_TIME_OPTIONS = {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

function getCurrentIstTime() {
  return new Date().toLocaleTimeString("en-IN", IST_TIME_OPTIONS);
}

function getCurrentIstDateTime() {
  const date = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${date}, ${getCurrentIstTime()}`;
}

function normalizeTimeInput(value) {
  if (!value) {
    return "";
  }

  const trimmedValue = String(value).trim();
  const match = trimmedValue.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return trimmedValue;
  }

  const hour = String(Math.min(Number(match[1]), 23)).padStart(2, "0");
  const minute = String(Math.min(Number(match[2]), 59)).padStart(2, "0");

  return `${hour}:${minute}`;
}

module.exports = {
  getCurrentIstDateTime,
  getCurrentIstTime,
  normalizeTimeInput,
};
