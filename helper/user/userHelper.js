import adminModel from "../../model/adminSchema.js";
import bcrypt from "bcrypt";
import { UsersModel } from "../../model/usersSchema.js";
import NotificationModel from "../../model/notificationSchema.js";
import FCMTokenModel from "../../model/fcmTokenSchema.js";
import NotificationService from "../../utils/sendPushNotification.js";
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
    const fcmTokens = await FCMTokenModel.findOne({ createdBy: adminId })
      .select("FCMTokens.token")
      .lean();
    if (fcmTokens && fcmTokens.FCMTokens.length > 0) {
      // Send push notifications to all tokens
      for (const tokenObj of fcmTokens.FCMTokens) {
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
        } catch (error) {
          console.error(`Failed to send notification to token: ${tokenObj.token}`, error);
        }
      }
    }

    return { success: true, message: "User added successfully" };
  } catch (error) {
    throw new Error("Error saving user data");
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

    const notificationMessage = `📩 New Request: ${request || 'Untitled'}. Please review it in your admin panel.`;

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
            requestTitle: request.title || 'No Title',
            requestDetails: request.details || 'No Details',
          }
        );
      } catch (error) {
        throw new Error(`Failed to send notification to token: ${tokenObj.token}` + error.message);
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


