export const IST_TIME_ZONE = "Asia/Kolkata";

export const formatCurrentIstTime = () =>
  new Date().toLocaleTimeString("en-IN", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

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
