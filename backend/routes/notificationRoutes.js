const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");

const router = express.Router();

router.get("/", async (req, res) => {
  const { recipientId, role } = req.query;
  if (!mongoose.Types.ObjectId.isValid(recipientId) || !["student", "teacher"].includes(role)) {
    return res.status(400).json({ message: "A valid recipient ID and role are required." });
  }
  try {
    const notifications = await Notification.find({ recipientId, recipientRole: role })
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json(notifications.map((item) => ({ ...item, id: item._id, read: Boolean(item.readAt) })));
  } catch (error) {
    res.status(500).json({ message: "Unable to load notifications." });
  }
});

router.patch("/:notificationId/read", async (req, res) => {
  const { recipientId, role } = req.body;
  const { notificationId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(recipientId) || !mongoose.Types.ObjectId.isValid(notificationId) || !["student", "teacher"].includes(role)) {
    return res.status(400).json({ message: "A valid recipient, notification, and role are required." });
  }
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId, recipientRole: role, readAt: null },
      { readAt: new Date() }, { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    res.json({ id: notification._id, read: true });
  } catch (error) {
    res.status(500).json({ message: "Unable to update notification." });
  }
});

module.exports = router;
