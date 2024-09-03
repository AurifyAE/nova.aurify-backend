import { fetchNotification, updateNotification } from "../../helper/admin/notificationHelper.js";
import { createAppError } from "../../utils/errorHandler.js";

export const getNotification = async (req, res, next) => {
    try {
      const { adminId } = req.params;
  
      if (!adminId) {
        throw createAppError("User ID is required.", 400);
      }
  
      const response = await fetchNotification(adminId);
  
      res.status(200).json({
        message: response.message,
        success: response.success,
        data: response.data, // If there's data returned, include it
      });
    } catch (error) {
      console.error("Error fetching notifications:", error.message);
      next(error);
    }
  };

  export const deleteNotification = async (req, res, next) => {
    try {
      const { adminId, notificationId } = req.params;
      const response = await updateNotification(adminId, notificationId);
      res
        .status(200)
        .json({ message: response.message, success: response.success });
    } catch (error) {
      next(error);
    }
  };
  
