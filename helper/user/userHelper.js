import adminModel from "../../model/adminSchema.js";
import bcrypt from "bcrypt";
import { UsersModel } from "../../model/usersSchema.js";
import NotificationModel from "../../model/notificationSchema.js";
import FCMTokenModel from "../../model/fcmTokenSchema.js";
import NotificationService from "../../utils/sendPushNotification.js";
import newsModel from "../../model/newsSchema.js";
import { spotRateModel } from "../../model/spotRateSchema.js";
// Function to hash the password
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    throw new Error("Error hashing password");
  }
};

export const userCollectionSave = async (data, adminId) => {
  try {
    const { userName, contact, location, email, password } = data;
    const encrypt = await hashPassword(password);
    const newUser = {
      userName,
      contact,
      location,
      email,
      password: encrypt, // Store the hashed password
    };
    let usersDoc = await UsersModel.findOne({ createdBy: adminId });
    const emailExists = usersDoc?.users.some((user) => user.email === email);

    if (emailExists) {
      return { success: false, message: "Email already exists for this Admin" };
    }
    if (!usersDoc) {
      usersDoc = new UsersModel({ createdBy: adminId, users: [newUser] });
    } else {
      usersDoc.users.push(newUser);
    }
    await usersDoc.save();

    const notificationMessage = `🎉 ${userName} has been added as a new user. Check your admin panel for details!`;

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

    // Fetch FCM tokens
    let fcmTokenDoc = await FCMTokenModel.findOne({ createdBy: adminId });

    if (fcmTokenDoc && fcmTokenDoc.FCMTokens.length > 0) {
      const invalidTokens = [];

      // Send push notifications to all tokens
      for (const tokenObj of fcmTokenDoc.FCMTokens) {
        try {
          await NotificationService.sendNotification(
            tokenObj.token,
            "New User Added",
            notificationMessage,
            {
              userName: userName,
              contact: contact,
            }
          );
          console.log(
            `Notification sent successfully to token: ${tokenObj.token}`
          );
        } catch (error) {
          console.error(
            `Failed to send notification to token: ${tokenObj.token}`,
            error
          );
          if (
            error.errorInfo &&
            error.errorInfo.code ===
              "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(tokenObj.token);
          }
        }
      }

      // Remove invalid tokens if any were found
      if (invalidTokens.length > 0) {
        console.log(`Removing ${invalidTokens.length} invalid tokens`);
        fcmTokenDoc.FCMTokens = fcmTokenDoc.FCMTokens.filter(
          (tokenObj) => !invalidTokens.includes(tokenObj.token)
        );
        await fcmTokenDoc.save();
      }
    }

    return { success: true, message: "User added successfully" };
  } catch (error) {
    throw new Error("Error saving user data");
  }
};
export const updateUserPassword = async (adminId, email, newPassword) => {
  try {
     // Check if the email exists in the database
     const userDoc = await UsersModel.findOne(
      { createdBy: adminId, "users.email": email },
      { "users.$": 1 }
    );

    if (!userDoc || userDoc.users.length === 0) {
      return { success: false, message: "User with this email not found." };
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password for the specific user
    const updateResult = await UsersModel.updateOne(
      { createdBy: adminId, "users.email": email },
      {
        $set: { "users.$.password": hashedPassword },
      }
    );

    if (updateResult.nModified === 0) {
      return { success: false, message: "User not found or password unchanged." };
    }

    return { success: true, message: "Password updated successfully." };
  } catch (error) {
    throw new Error("Error during password update: " + error.message);
  }
};
export const userVerfication = async (adminId, email, password) => {
  try {
    const usersDoc = await UsersModel.findOne({ createdBy: adminId });
    if (!usersDoc) {
      return { success: false, message: "Admin not found" };
    }
    const user = usersDoc.users.find((user) => user.email === email);

    if (!user) {
      return { success: false, message: "User not found" };
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return { success: false, message: "Invalid password." };
    }
    return { success: true, message: "Login successful" };
  } catch (error) {
    throw new Error("Error during login: " + error.message);
  }
};

export const userUpdateSpread = async (adminId, userId, spread, title) => {
  try {
    const usersDoc = await UsersModel.findOneAndUpdate(
      { createdBy: adminId, "users._id": userId },
      { $set: { "users.$.spread": spread, "users.$.spreadTitle": title } },
      { new: true }
    );
    if (!usersDoc) {
      return { success: false, message: "User not found" };
    }
    return { success: true, message: "Spread value updated successfully" };
  } catch (error) {
    throw new Error("Error updating spread value" + error.message);
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

export const getNewsByAdminId = async (adminId) => {
  try {
    const news = await newsModel.findOne({ createdBy: adminId });

    if (!news) {
      return {
        success: false,
        news: null,
        message: "No news found for this admin",
      };
    }

    return {
      success: true,
      news,
      message: "News fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      news: null,
      message: "Error fetching news: " + error.message,
    };
  }
};


