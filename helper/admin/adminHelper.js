import adminModel from "../../model/adminSchema.js";
import { SpreadValueModel } from "../../model/spreadValueSchema.js";
import bcrypt from "bcrypt";
import { UsersModel } from "../../model/usersSchema.js";
import DeviceModel from '../../model/deviceSchema.js'
import NotificationModel from "../../model/notificationSchema.js";
import FCMTokenModel from "../../model/fcmTokenSchema.js";
import mongoose from "mongoose";
// Function to hash the password
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    throw new Error("Error hashing password");
  }
};
export const adminVerfication = async (userName) => {
  try {
    return await adminModel.findOne({ userName });
  } catch (error) {
    console.error("Error in userVerfication:", error.message);
    throw new Error("Verification failed: " + error.message);
  }
};

export const getUserData = async (userName) => {
  try {
    return await adminModel.findOne({ userName: userName }).select("-password");
  } catch (error) {
    console.error("Error in finding the user:", error.message);
    throw new Error("searching failed: " + error.message);
  }
};

export const updateUserData = async (id, email, fullName, mobile, location) => {
  try {
    return await adminModel
      .findByIdAndUpdate(
        id,
        {
          email: email,
          userName: fullName,
          contact: mobile,
          address: location,
        },
        { new: true, runValidators: true }
      )
      .select("-password");
  } catch (error) {
    console.error("Error in updateing the user:", error.message);
    throw new Error("Updation failed: " + error.message);
  }
};

export const updateUserLogo = async (userName, logoName) => {
  try {
    return await adminModel.findOneAndUpdate(
      { userName: userName },
      { logo: logoName },
      { new: true }
    );
  } catch (error) {
    console.error("Error in updating the logo:", error.message);
    throw new Error("Logo Updation failed: " + error.message);
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

    return { success: true, message: "User added successfully" };
  } catch (error) {
    throw new Error("Error saving user data");
  }
};


export const getCommodity = async (userName) => {
  try {
    return await adminModel.findOne({ userName });
  } catch (error) {
    console.error("Error in fetching Commodity:", error.message);
    throw new Error("fetching failed: " + error.message);
  }
};
export const getMetals = async (userName) => {
  try {
    return await adminModel.findOne({ userName: userName }).select("-password");
  } catch (error) {
    console.error("Error in finding the metals:", error.message);
    throw new Error("searching failed: " + error.message);
  }
};

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

export const addFCMToken = async (userName, fcmToken) => {
  try {
    if (!fcmToken || fcmToken.trim() === '') {
      return { success: false, message: "Invalid FCM token." };
    }
    const admin = await adminModel.findOne({ userName });

    if (!admin) {
      return { success: false, message: "Invalid userName. Admin not found." };
    }

    let fcmEntry = await FCMTokenModel.findOne({ createdBy: admin._id });

    if (fcmEntry) {
      const tokenExists = fcmEntry.FCMTokens.some(
        (tokenObj) => tokenObj.token === fcmToken
      );

      if (tokenExists) {
        return { success: false, message: "FCM token already exists." };
      } else {
        fcmEntry.FCMTokens.push({ token: fcmToken });
      }
    } else {
      fcmEntry = new FCMTokenModel({
        FCMTokens: [{ token: fcmToken }],
        createdBy: admin._id,
      });
    }

    await fcmEntry.save();

    return { success: true, message: "FCM token successfully added." };
  } catch (error) {
    throw new Error("Error FCMToken " + error.message);
  }
};

export const getUsersForAdmin = async (adminId) => {
  try {
    const createdBy = new mongoose.Types.ObjectId(adminId);
    const usersDoc = await UsersModel.findOne({ createdBy });

    if (!usersDoc) {
      return { success: false, message: "No users found for this admin" };
    }
    return { success: true, users: usersDoc.users };
  } catch (error) {
    throw new Error("Error fetching users: " + error.message);
  }
};

export const addSpreadValue = async (userName, spreadValue, title) => {
  try {
    const user = await adminModel.findOne({ userName: userName });
    if (!user) {
      return { success: false, message: "Admin not found" };
    }

    // Find the spread value document for this admin, or create a new one if it doesn't exist
    let spreadDoc = await SpreadValueModel.findOneAndUpdate(
      { createdBy: user._id },
      {
        $push: { spreadValues: { spreadValue, title } },
        $setOnInsert: { createdBy: user._id },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return {
      success: true,
      message: "Spread value added successfully",
      spreadDoc,
    };
  } catch (error) {
    console.error("Error adding spread value:", error);
    return { success: false, message: error.message };
  }
};

export const getSpreadValues = async (userName) => {
  try {
    const user = await adminModel.findOne({ userName: userName });
    if (!user) {
      return null;
    }
    const spreadDoc = await SpreadValueModel.findOne({ createdBy: user._id });
    if (!spreadDoc) {
      return {
        success: false,
        message: "No spread values found for this admin",
      };
    }
    return { success: true, spreadValues: spreadDoc.spreadValues };
  } catch (error) {
    throw new Error("Error fetching spread values: " + error.message);
  }
};

export const deleteSpreadValue = async (adminId, spreadValueId) => {
  try {
    const user = await adminModel.findOne({ _id: adminId });
    if (!user) {
      return { success: false, message: "Admin not found" };
    }

    const result = await SpreadValueModel.updateOne(
      { createdBy: user._id },
      { $pull: { spreadValues: { _id: spreadValueId } } }
    );

    if (result.modifiedCount > 0) {
      return { success: true, message: "Spread value deleted successfully" };
    } else {
      return {
        success: false,
        message: "Spread value not found or already deleted",
      };
    }
  } catch (error) {
    console.error("Error deleting spread value:", error);
    throw new Error("Error deleting spread value: " + error.message);
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

export const fetchActiveDevice = async (adminId) => {
  try {
    const createdBy = new mongoose.Types.ObjectId(adminId);
    const deviceDoc = await DeviceModel.findOne({ adminId: createdBy });
    
    // If no deviceDoc found, return activeDeviceCount as 0 without throwing an error
    if (!deviceDoc) {
      return { success: true, message: "No device found", activeDeviceCount: 0 };
    }

    const activeDeviceCount = deviceDoc.devices.filter(device => device.isActive).length;
    
    return {
      success: true,
      activeDeviceCount: activeDeviceCount,
    };
  } catch (error) {
    console.error("Error fetching active devices:", error);
    throw new Error("Error fetching active devices: " + error.message);
  }
};
