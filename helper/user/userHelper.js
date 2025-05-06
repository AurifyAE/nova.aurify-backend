import adminModel from "../../model/adminSchema.js";
import { UsersModel } from "../../model/usersSchema.js";
import NotificationModel from "../../model/notificationSchema.js";
import FCMTokenModel from "../../model/fcmTokenSchema.js";
import UserFCMTokenModel from "../../model/userFCMToken.js";
import NotificationService from "../../utils/sendPushNotification.js";
import { encryptPassword, decryptPassword } from "../../utils/crypto.js";
import { VideoBannerModel } from "../../model/videoBannerSchema.js";
import UserNotificationModel from '../../model/userNotificationSchema.js'
import { spotRateModel } from "../../model/spotRateSchema.js";

export const updateUserPassword = async (adminId, contact, newPassword) => {
  try {
    // Check if the email exists in the database
    const userDoc = await UsersModel.findOne(
      { createdBy: adminId, "users.contact": contact },
      { "users.$": 1 }
    );

    if (!userDoc || userDoc.users.length === 0) {
      return { success: false, message: "User with this contact not found." };
    }

    const { iv, encryptedData } = encryptPassword(newPassword);

    // Update the password for the specific user
    const updateResult = await UsersModel.updateOne(
      { createdBy: adminId, "users.contact": contact },
      {
        $set: {
          "users.$.password": encryptedData,
          "users.$.passwordAccessKey": iv,
        },
      }
    );

    if (updateResult.nModified === 0) {
      return {
        success: false,
        message: "User not found or password unchanged.",
      };
    }

    return { success: true, message: "Password updated successfully." };
  } catch (error) {
    throw new Error("Error during password update: " + error.message);
  }
};
export const getAdminProfile = async (adminId) => {
  try {
    // Fetch admin details using the adminId
    const adminDoc = await adminModel.findOne(
      { _id: adminId }, // Find admin by their ID
      {
        _id: 1,
        userName: 1,
        companyName: 1,
        address: 1,
        email: 1,
        contact: 1,
        whatsapp: 1,
      } // Select specific fields to return
    );

    // Check if admin exists
    if (!adminDoc) {
      return { success: false, message: "Admin not found." };
    }

    // Convert contact and whatsapp to numbers
    const adminData = adminDoc.toObject();

    // Convert contact and whatsapp to numbers
    adminData.contact = adminData.contact ? Number(adminData.contact) : null;
    adminData.whatsapp = adminData.whatsapp ? Number(adminData.whatsapp) : null;
    // Return admin details with converted contact and whatsapp fields
    return {
      success: true,
      message: "Admin profile retrieved successfully.",
      data: adminData,
    };
  } catch (error) {
    throw new Error("Error during admin profile retrieval: " + error.message);
  }
};

export const getSportrate = async (adminId) => {
  try {
    const fetchSpotRate = await spotRateModel.findOne({ createdBy: adminId });

    if (!fetchSpotRate) {
      return { success: false, fetchSpotRate: null };
    }

    return { success: true, fetchSpotRate };
  } catch (error) {
    throw new Error("Error fetching SpotRate: " + error.message);
  }
};

export const userVerification = async (adminId, contact, password, token) => {
  try {
    const usersDoc = await UsersModel.findOne({ createdBy: adminId });
    if (!usersDoc) {
      return { success: false, message: "Admin not found" };
    }
    const user = usersDoc.users.find((user) => user.contact === contact);

    if (!user) {
      return {
        success: false,
        message: "Invalid contact number. Authentication failed.",
      };
    }
    const decryptedPassword = decryptPassword(
      user.password,
      user.passwordAccessKey
    );
    if (password !== decryptedPassword) {
      return { success: false, message: "Invalid password." };
    }
    return { success: true, message: "Login successful", userId: user._id };
  } catch (error) {
    throw new Error("Error during login: " + error.message);
  }
};
export const addFCMToken = async (userId, fcmToken) => {
  try {
    if (!fcmToken || fcmToken.trim() === "") {
      return { success: false, message: "Invalid FCM token." };
    }

    // Find user by userId
    const user = await UsersModel.findOne({ "users._id": userId });

    if (!user) {
      return { success: false, message: "User not found." };
    }

    let fcmEntry = await UserFCMTokenModel.findOne({ createdBy: userId });

    if (fcmEntry) {
      const tokenExists = fcmEntry.FCMTokens.some(
        (tokenObj) => tokenObj.token === fcmToken
      );

      if (tokenExists) {
        return { success: true, message: "FCM token already exists." };
      }

      // Add new token
      fcmEntry.FCMTokens.push({ token: fcmToken });
    } else {
      fcmEntry = new UserFCMTokenModel({
        FCMTokens: [{ token: fcmToken }],
        createdBy: userId,
      });
    }

    await fcmEntry.save();
    return { success: true, message: "FCM token successfully added." };
  } catch (error) {
    throw new Error("Error adding FCM token: " + error.message);
  }
};
export const getVideoBannerDetails = async (adminId) => {
  try {
    const bannerDocument = await VideoBannerModel.findOne({
      createdBy: adminId,
    });

    if (!bannerDocument) {
      return {
        success: false,
        banners: [],
        message: "No VideoBanner found for this admin",
      };
    }

    // Flatten the videos array and extract only the location links
    const locations = bannerDocument.banner
      .flatMap((item) => item.videos) // Extract all videos arrays and flatten them
      .map((video) => video.location); // Extract only the location property

    return {
      success: true,
      banners: locations,
      message: "VideoBanner fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      banners: [],
      message: "Error fetching VideoBanner: " + error.message,
    };
  }
};
export const requestPassInAdmin = async (adminId, request) => {
  try {
    const notificationMessage = `📩 New Request: ${
      request || "Untitled"
    }. Please review it in your admin panel.`;

    let notificationDoc = await NotificationModel.findOne({
      createdBy: adminId,
    });

    if (!notificationDoc) {
      notificationDoc = new NotificationModel({
        createdBy: adminId,
        notification: [{ message: notificationMessage }],
      });
    } else {
      notificationDoc.notification.push({ message: notificationMessage });
    }

    await notificationDoc.save();
    const fcmTokens = await FCMTokenModel.findOne({ createdBy: adminId })
      .select("FCMTokens.token")
      .lean();

    if (fcmTokens && fcmTokens.FCMTokens.length > 0) {
      // Send push notifications to all tokens
      for (const tokenObj of fcmTokens.FCMTokens) {
        try {
          await NotificationService.sendNotification(
            tokenObj.token,
            "New Request Added",
            notificationMessage,
            {
              requestTitle: request.title || "No Title",
              requestDetails: request.details || "No Details",
            }
          );
        } catch (error) {
          throw new Error(
            `Failed to send notification to token: ${tokenObj.token}` +
              error.message
          );
        }
      }
    } else {
      return { success: false, message: "No FCM tokens found for this admin" };
    }
    return { success: true, message: "Requesting add successfully" };
  } catch (error) {
    throw new Error("Error For the Requesting" + error.message);
  }
};

export const getUserNotifications = async (userId) => {
  try {
    const notifications = await UserNotificationModel.findOne({ createdBy: userId });
    
    if (!notifications) {
      return { 
        notifications: { notification: [] }, 
        unreadCount: 0 
      };
    }
    
    // Sort notifications by createdAt in descending order (newest first)
    notifications.notification.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Count unread messages (where read is false)
    const unreadCount = notifications.notification.filter(msg => msg.read === false).length;
    
    return { 
      notifications,
      unreadCount
    };
  } catch (error) {
    throw new Error("Error fetching notifications: " + error.message);
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const result = await UserNotificationModel.findOneAndUpdate(
      { 
        createdBy: userId, 
        "notification._id": notificationId 
      },
      { 
        $set: { "notification.$.read": true } 
      },
      { new: true }
    );
    
    if (!result) {
      throw new Error("Notification not found");
    }
    
    return result;
  } catch (error) {
    throw new Error("Error marking notification as read: " + error.message);
  }
};

// Delete a notification
export const deleteNotification = async (userId, notificationId) => {
  try {
    const result = await UserNotificationModel.findOneAndUpdate(
      { createdBy: userId },
      { 
        $pull: { notification: { _id: notificationId } } 
      },
      { new: true }
    );
    
    if (!result) {
      throw new Error("Notification not found");
    }
    
    return result;
  } catch (error) {
    throw new Error("Error deleting notification: " + error.message);
  }
};

// Delete all notifications for a user
export const deleteAllNotifications = async (userId) => {
  try {
    const result = await UserNotificationModel.findOneAndUpdate(
      { createdBy: userId },
      { $set: { notification: [] } },
      { new: true }
    );
    
    if (!result) {
      throw new Error("User notifications not found");
    }
    
    return result;
  } catch (error) {
    throw new Error("Error deleting all notifications: " + error.message);
  }
};