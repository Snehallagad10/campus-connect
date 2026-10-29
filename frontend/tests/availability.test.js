import test from "node:test";
import assert from "node:assert/strict";
import { isTeacherAvailableNow } from "../src/utils/istTime.js";

test("availability is true while the enabled slot is active", () => {
  assert.equal(isTeacherAvailableNow({ isAvailable: true, startTime: "09:00", endTime: "10:00" }, "09:30"), true);
});

test("availability is false outside the configured slot or when disabled", () => {
  assert.equal(isTeacherAvailableNow({ isAvailable: true, startTime: "09:00", endTime: "10:00" }, "10:00"), false);
  assert.equal(isTeacherAvailableNow({ isAvailable: false, startTime: "09:00", endTime: "10:00" }, "09:30"), false);
});

test("availability supports overnight slots", () => {
  const slot = { isAvailable: true, startTime: "23:00", endTime: "01:00" };
  assert.equal(isTeacherAvailableNow(slot, "23:30"), true);
  assert.equal(isTeacherAvailableNow(slot, "00:30"), true);
  assert.equal(isTeacherAvailableNow(slot, "12:00"), false);
});
