
import mongoose from 'mongoose';
import NotificationModel from "../../model/notificationSchema.js";

export const fetchNotification = async (adminId) => {
    try {
      const createdBy = new mongoose.Types.ObjectId(adminId);
      const notifications = await NotificationModel.findOne({ createdBy });
      if (!notifications) {
        return { success: false, message: "Notification not found" };
      }
  
      return {
        success: true,
        message: "Notification found",
        data: notifications,
      };
    } catch (error) {
      throw new Error("Error fetching notification: " + error.message);
    }
  };

  
export const updateNotification = async (adminId, notificationId) => {
    try {
      await NotificationModel.updateOne(
        { createdBy: adminId },
        { $pull: { notification: { _id: notificationId } } }
      );
      return { success: true, message: "Notification cleared" };
    } catch (error) {
      throw new Error("Error updating notification" + error.message);
    }
  };
  