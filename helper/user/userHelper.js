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

// export const addFCMToken = async (email, fcmToken) => {
//   try {
//     const admin = await adminModel.findOne({ email });

//     if (!admin) {
//       return { success: false, message: "Invalid email. Admin not found." };
//     }

//     let fcmEntry = await FCMTokenModel.findOne({ createdBy: admin._id });

//     if (fcmEntry) {
//       const tokenExists = fcmEntry.FCMTokens.some(
//         (tokenObj) => tokenObj.token === fcmToken
//       );

//       if (tokenExists) {
//         return { success: false, message: "FCM token already exists." };
//       } else {
//         fcmEntry.FCMTokens.push({ token: fcmToken });
//       }
//     } else {
//       fcmEntry = new FCMTokenModel({
//         FCMTokens: [{ token: fcmToken }],
//         createdBy: admin._id,
//       });
//     }

//     await fcmEntry.save();

//     return { success: true, message: "FCM token successfully added." };
//   } catch (error) {
//     throw new Error("Error FCMToken " + error.message);
//   }
// };
