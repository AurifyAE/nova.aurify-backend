import mongoose from "mongoose";

const UserNotificationSchema = new mongoose.Schema({
  notification: [
    {
      message: { type: String, required: true },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
      ref: "Users.users",
      required: true,
  },
});

const NotificationModel = mongoose.model("UserNotification", UserNotificationSchema);
export default NotificationModel;
