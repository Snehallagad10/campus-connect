import test from "node:test";
import assert from "node:assert/strict";
import { getTeacherAvailabilityStatus, isTeacherAvailableNow } from "../src/utils/istTime.js";

const slot = { isAvailable: true, startTime: "16:00", endTime: "18:00" };

test("disabled availability stays unavailable", () => {
  assert.equal(getTeacherAvailabilityStatus({ ...slot, isAvailable: false }, "17:00"), "Unavailable");
});

test("enabled future slots are scheduled, not unavailable", () => {
  assert.equal(getTeacherAvailabilityStatus(slot, "11:01"), "Scheduled");
});

test("active slots are available now", () => {
  assert.equal(getTeacherAvailabilityStatus(slot, "17:00"), "Available now");
  assert.equal(isTeacherAvailableNow(slot, "17:00"), true);
});

test("ended same-day slots report that they have ended", () => {
  assert.equal(getTeacherAvailabilityStatus(slot, "18:00"), "Slot ended");
});

test("overnight slots remain active across midnight and schedule during the gap", () => {
  const overnight = { isAvailable: true, startTime: "23:00", endTime: "01:00" };
  assert.equal(getTeacherAvailabilityStatus(overnight, "23:30"), "Available now");
  assert.equal(getTeacherAvailabilityStatus(overnight, "00:30"), "Available now");
  assert.equal(getTeacherAvailabilityStatus(overnight, "12:00"), "Scheduled");
});

test("invalid time ranges are reported clearly", () => {
  assert.equal(getTeacherAvailabilityStatus({ ...slot, endTime: "16:00" }, "16:00"), "Invalid slot");
});
