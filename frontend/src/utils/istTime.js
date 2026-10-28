export const IST_TIME_ZONE = "Asia/Kolkata";

export const formatCurrentIstTime = () =>
  new Date().toLocaleTimeString("en-IN", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

export const timeToMinutes = (value) => {
  const match = String(value || "").trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

export const parse24HourTime = (value) => {
  const minutes = timeToMinutes(value);
  if (minutes === null) return null;
  const hour24 = Math.floor(minutes / 60);
  return {
    hour: String(hour24 % 12 || 12),
    minute: String(minutes % 60).padStart(2, "0"),
    period: hour24 < 12 ? "AM" : "PM",
  };
};

export const format12HourTime = ({ hour, minute, period }) => {
  const hour12 = Number(hour);
  const minuteValue = Number(minute);
  if (!Number.isInteger(hour12) || hour12 < 1 || hour12 > 12 ||
      !Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 59 ||
      !["AM", "PM"].includes(period)) {
    return "";
  }

  const hour24 = period === "AM"
    ? hour12 % 12
    : (hour12 % 12) + 12;
  return `${String(hour24).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")}`;
};

export const isValidAvailabilitySlot = (startTime, endTime) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return start !== null && end !== null && start !== end;
};

export const formatTime12Hour = (value) => {
  const minutes = timeToMinutes(value);
  if (minutes === null) return "Time not set";
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
};

export const formatAvailabilityDuration = (startTime, endTime) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || start === end) return "";

  const durationMinutes = (end - start + 24 * 60) % (24 * 60);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  return parts.join(" and ");
};

export const formatAvailabilityNotification = (teacher) => {
  const labValue = String(teacher?.labNo || "").trim().replace(/^lab(?:\s+number)?\s*/i, "");
  const lab = labValue ? `Lab ${labValue}` : "Lab number not set";
  const duration = formatAvailabilityDuration(teacher?.startTime, teacher?.endTime);
  return `${teacher?.name || "Teacher"} is available from ${formatTime12Hour(teacher?.startTime)} to ${formatTime12Hour(teacher?.endTime)} in ${lab}${duration ? ` (for ${duration})` : ""}.`;
};

export const isTeacherAvailableNow = (teacher, currentTime = formatCurrentIstTime()) => {
  if (!teacher?.isAvailable || !isValidAvailabilitySlot(teacher.startTime, teacher.endTime)) {
    return false;
  }

  const start = timeToMinutes(teacher.startTime);
  const end = timeToMinutes(teacher.endTime);
  const current = timeToMinutes(currentTime);
  if (current === null) return false;

  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
};

export const formatLabNumber = (labNo) => {
  const value = String(labNo || "").trim();
  if (!value) return "Lab Number not set";
  const number = value.replace(/^lab(?:\s+number)?\s*/i, "");
  return `Lab Number ${number || value}`;
};

export const toIstDate = (date = new Date()) =>
  new Date(date.toLocaleString("en-US", { timeZone: IST_TIME_ZONE }));

export const normalizeTimeInput = (value) => {
  if (!value) {
    return "";
  }

  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return String(value).trim();
  }

  const hour = String(Math.min(Number(match[1]), 23)).padStart(2, "0");
  const minute = String(Math.min(Number(match[2]), 59)).padStart(2, "0");

  return `${hour}:${minute}`;
};

export const formatTimeRange = (startTime, endTime) => {
  const start = normalizeTimeInput(startTime);
  const end = normalizeTimeInput(endTime);

  return start && end ? `${start} - ${end}` : "";
};
