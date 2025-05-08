import {
  requestPassInAdmin,
  updateUserPassword,
  userVerification,
  getAdminProfile,
  addFCMToken,
  getVideoBannerDetails,
  deleteAllNotifications,
  deleteNotification,
  markNotificationAsRead,
  getUserNotifications,
  getSportrate
} from "../../helper/user/userHelper.js";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";
import { UsersModel } from "../../model/usersSchema.js";
import adminModel from "../../model/adminSchema.js";
import { CategoryModel } from "../../model/categorySchema.js";
import mongoose from "mongoose";

export const userLoginController = async (req, res, next) => {
  try {
    const { contact, password, token } = req.body;
    const { adminId } = req.params;

    const response = await userVerification(adminId, contact, password);

    if (!response.success) {
      return res
        .status(401)
        .json({ message: response.message, success: false });
    }

    const userId = response.userId;

    const user = await UsersModel.aggregate([
      { $unwind: "$users" },
      { $match: { "users.contact": contact } },
      {
        $lookup: {
          from: "categories",
          localField: "users.categoryId",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "userspotrates",
          localField: "users.userSpotRateId",
          foreignField: "_id",
          as: "userSpotRateDetails",
        },
      },
      {
        $addFields: {
          "users.categoryName": {
            $cond: {
              if: { $gt: [{ $size: "$categoryDetails" }, 0] },
              then: { $arrayElemAt: ["$categoryDetails.name", 0] },
              else: null
            }
          },
          // Add userSpotRateId to the response if it exists
          "users.userSpotRateId": {
            $cond: {
              if: { $gt: [{ $size: "$userSpotRateDetails" }, 0] },
              then: { $arrayElemAt: ["$userSpotRateDetails._id", 0] },
              else: null
            }
          }
        },
      },
      {
        $project: {
          _id: 0,
          "users._id": 1,
          "users.name": 1,
          "users.email": 1,
          "users.contact": 1,
          "users.address": 1,
          "users.categoryId": 1,
          "users.userSpotRateId": 1, // Include userSpotRateId in the projection
          "users.cashBalance": 1,
          "users.goldBalance": 1,
          "users.categoryName": 1,
        },
      },
    ]);

    if (!user || user.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    const userDetails = user[0].users;
    await addFCMToken(userDetails._id, token);

    res.status(200).json({
      message: response.message,
      success: response.success,
      userId: response.userId,
      userDetails,
    });
  } catch (error) {
    next(error);
  }
};

export const fetchProductCount = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    if (!categoryId) {
      return res.status(400).json({ message: "Category ID is required", success: false });
    }

    const category = await CategoryModel.findById(categoryId).select("products");
    const productCount = category ? category.products.length : 0;

    res.status(200).json({
      success: true,
      productCount,
    });
  } catch (error) {
    next(error);
  }
};
export const checkCategoryStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return next(createAppError("User ID is required", 400));
    }

    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Find the user and check their categoryId and userSpotRateId
    const user = await UsersModel.aggregate([
      { $unwind: "$users" },
      { $match: { "users._id": userObjectId } },
      {
        $project: {
          _id: 0,
          categoryId: "$users.categoryId",
          userSpotRateId: "$users.userSpotRateId",
          name: "$users.name"
        }
      }
    ]);

    if (!user || user.length === 0) {
      return next(createAppError("User not found", 404));
    }

    const userInfo = user[0];
    
    // Check if categoryId exists (not null)
    const hasCategoryId = userInfo.categoryId !== null && userInfo.categoryId !== undefined;
    
    // Check if userSpotRateId exists (not null)
    const hasUserSpotRateId = userInfo.userSpotRateId !== null && userInfo.userSpotRateId !== undefined;

    // Prepare response
    const response = {
      success: true,
      user: {
        name: userInfo.name,
        userId: userId,
        hasCategoryId: hasCategoryId,
        hasUserSpotRateId: hasUserSpotRateId
      }
    };

    // If IDs exist, include them in the response
    if (hasCategoryId) {
      response.user.categoryId = userInfo.categoryId;
    }

    if (hasUserSpotRateId) {
      response.user.userSpotRateId = userInfo.userSpotRateId;
    }

    res.status(200).json(response);
    
  } catch (error) {
    next(error);
  }
}
export const getVideoBanner = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { success, banners, message } = await getVideoBannerDetails(adminId);

    if (!success) {
      return res.status(204).json({
        success: false,
        message,
      });
    }

    return res.status(200).json({
      success: true,
      banners,
      message: "VideoBanner fetching successfully",
    });
  } catch (error) {
    next(error);
  }
};
export const getProfile = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const response = await getAdminProfile(adminId);
    res.status(200).json({
      message: response.message,
      success: response.success,
      info: response.data,
    });
  } catch (error) {
    next(error);
  }
};
export const forgotPassword = async (req, res, next) => {
  try {
    const { contact, password } = req.body;
    const { adminId } = req.params;
    const response = await updateUserPassword(adminId, contact, password);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};
export const requestAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { request } = req.body;
    const response = await requestPassInAdmin(adminId, request);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};

export const fetchAdminBankDetails = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const adminData = await adminModel.findById(adminId, "bankDetails");
    if (!adminData) {
      return res.status(204).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      bankInfo: adminData,
      message: "Fetch banking details successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const { notifications, unreadCount } = await getUserNotifications(userId);
    
    return res.status(200).json({
      success: true,
      data: {
        notifications: notifications.notification,
        unreadCount
      },
      message: "Notifications fetched successfully"
    });
  } catch (error) {
    next(error);
  }
};

// Mark a notification as read
export const readNotification = async (req, res, next) => {
  try {
    const { notificationId,userId } = req.params;
    
    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required"
      });
    }
    
    const result = await markNotificationAsRead(userId, notificationId);
    
    return res.status(200).json({
      success: true,
      data: result,
      message: "Notification marked as read"
    });
  } catch (error) {
    next(error);
  }
};

// Delete a specific notification
export const removeNotification = async (req, res, next) => {
  try {
    const {userId, notificationId } = req.params;
    
    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required"
      });
    }
    
    const result = await deleteNotification(userId, notificationId);
    
    return res.status(200).json({
      success: true,
      data: result,
      message: "Notification deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

// Delete all notifications for a user
export const clearAllNotifications = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const result = await deleteAllNotifications(userId);
    
    return res.status(200).json({
      success: true,
      data: result,
      message: "All notifications cleared successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const getSpotrateDetails = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { success, fetchSpotRate } = await getSportrate(adminId);

    if (!success || !fetchSpotRate) {
      return res.status(204).json({
        success: false,
        message: "SpotRate data not found",
      });
    }

    return res.status(200).json({
      success: true,
      info: fetchSpotRate,
      message: "Fetching SpotRate successfully",
    });
  } catch (error) {
    next(error);
  }
};