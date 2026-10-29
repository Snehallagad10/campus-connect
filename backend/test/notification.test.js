const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");

test("notification records require a recipient, role, event type, and message", async () => {
  const notification = new Notification({});
  const error = await notification.validate().catch((validationError) => validationError);
  assert.ok(error instanceof mongoose.Error.ValidationError);
  assert.ok(error.errors.recipientId);
  assert.ok(error.errors.recipientRole);
  assert.ok(error.errors.type);
  assert.ok(error.errors.message);
});

test("notification roles and event types reject unsupported values", async () => {
  const notification = new Notification({
    recipientId: new mongoose.Types.ObjectId(),
    recipientRole: "admin",
    type: "push",
    message: "Test notification",
  });
  const error = await notification.validate().catch((validationError) => validationError);
  assert.ok(error instanceof mongoose.Error.ValidationError);
  assert.ok(error.errors.recipientRole);
  assert.ok(error.errors.type);
});

test("new notification records start unread", () => {
  const notification = new Notification({
    recipientId: new mongoose.Types.ObjectId(),
    recipientRole: "student",
    type: "availability",
    message: "A teacher is available",
  });
  assert.equal(notification.readAt, null);
});
