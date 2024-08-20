import adminModel from "../../model/adminSchema.js";
import bcrypt from "bcrypt";
import { UsersModel } from "../../model/usersSchema.js";
import NotificationsModel from "../../model/notificationSchema.js";
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
    throw new Error("Verification failed");
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
      return { success: false, message: "Invalid email" };
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

export const userUpdateSpread = async (adminId, userId, spread) => {
  try {
    const usersDoc = await UsersModel.findOneAndUpdate(
      { createdBy: adminId, "users._id": userId },
      { $set: { "users.$.spread": spread } },
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

export const updateNotification = async (adminId, notificationId) => {
  try {
    await NotificationsModel.updateOne(
      { createdBy: adminId },
      { $pull: { notification: { _id: notificationId } } }
    );
    return { success: true, message: "Notification cleared" };
  } catch (error) {
    throw new Error("Error updating notification" + error.message);
  }
};
