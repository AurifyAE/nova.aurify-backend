import adminModel from "../../model/adminSchema.js";
import bcrypt from "bcrypt";
import { UsersModel } from "../../model/usersSchema.js";
import NotificationModel from "../../model/notificationSchema.js";
import FCMTokenModel from "../../model/fcmTokenSchema.js";
// Function to hash the password
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    throw new Error("Error hashing password");
  }
};
export const adminVerfication = async (email) => {
  try {
    return await adminModel.findOne({ email });

  } catch (error) {
    console.error("Error in userVerfication:", error.message); 
    throw new Error("Verification failed: " + error.message);
  }
};

export const getUserData = async (userEmail) => {
  try {
    return await adminModel.findOne({email: userEmail}).select('-password');

  } catch (error) {
    console.error("Error in finding the user:", error.message); 
    throw new Error("searching failed: " + error.message);
  }
};


export const updateUserData = async (id, email, fullName, mobile, location) => {
  try {
    return await adminModel.findByIdAndUpdate(
      id,
      { 
        email: email,
        userName: fullName,
        contact: mobile,
        address: location
      },
      { new: true, runValidators: true }
    ).select('-password');

  } catch (error) {
    console.error("Error in updateing the user:", error.message); 
    throw new Error("Updation failed: " + error.message);
  }
};

export const updateUserLogo = async (email, logoName) => {
  try {
    return await adminModel.findOneAndUpdate(
      { email: email },
      { logo: logoName },
      { new: true }
    );

  } catch (error) {
    console.error("Error in updating the logo:", error.message); 
    throw new Error("Logo Updation failed: " + error.message);
  }
};

export const getCommodity = async (email) => {
  try {
    return await adminModel.findOne({ email });

  } catch (error) {
    console.error("Error in fetching Commodity:", error.message); 
    throw new Error("fetching failed: " + error.message);
  }
};
export const getMetals = async (userEmail) => {
  try {
    console.log('working');
    return await adminModel.findOne({email: userEmail}).select('-password');

  } catch (error) {
    console.error("Error in finding the metals:", error.message); 
    throw new Error("searching failed: " + error.message);
  }
};

export const fetchNotification = async (userId) => {
  try {
    const createdBy = new mongoose.Types.ObjectId(userId);
    const notifications = await NotificationModel.find({ createdBy }); 
    if (!notifications) {
      return { success: false, message: "Notification not found" };
    }
    
    return { success: true, message: "Notification found", data: notifications };
  } catch (error) {
    throw new Error("Error fetching notification: " + error.message);
  }
}

export const addFCMToken = async (email, fcmToken) => {
  try {
    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return { success: false, message: "Invalid email. Admin not found." };
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
