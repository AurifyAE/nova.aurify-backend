import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  notification: [
    {
      message: { type: String, required: true },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
});

const NotificationModel = mongoose.model("notification", NotificationSchema);
export default NotificationModel;
