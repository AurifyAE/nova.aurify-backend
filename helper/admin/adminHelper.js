import adminModel from "../../model/adminSchema.js";
import { SpreadValueModel } from "../../model/spreadValueSchema.js";
import { UsersModel } from "../../model/userSchema.js";

export const userVerfication = async (email) => {
  try {
    const user = await adminModel.findOne({ email });
    if (!user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error("Error in userVerfication:", error.message);
    throw new Error("Verification failed: " + error.message);
  }
};


export const getUsersForAdmin = async (adminEmail) => {
  try {
    const user = await adminModel.findOne({ email: adminEmail });
    if (!user) {
      return null;
    }
    const usersDoc = await UsersModel.findOne({ createdBy: user._id });

    if (!usersDoc) {
      return { success: false, message: "No users found for this admin" };
    }
    return { success: true, users: usersDoc.users };
  } catch (error) {
    throw new Error("Error fetching users: " + error.message);
  }
};

export const addSpreadValue = async (adminEmail, spreadValue) => {
  try {
    const user = await adminModel.findOne({ email: adminEmail });
    if (!user) {
      return null;
    }
    let spreadDoc = await SpreadValueModel.findOne({ createdBy: user._id });
    if (!spreadDoc) {
      spreadDoc = new SpreadValueModel({ adminId: user._id, spreadValues: [spreadValue] });
    } else {
      spreadDoc.spreadValues.push(spreadValue);
    }
    await spreadDoc.save();
    return { success: true, message: "Spread value added successfully" };
  } catch (error) {
    throw new Error("Error adding spread value: " + error.message);
  }
};

export const getSpreadValues = async (adminEmail) => {
  try {
    const user = await adminModel.findOne({ email: adminEmail });
    if (!user) {
      return null;
    }
    const spreadDoc = await SpreadValueModel.findOne({ createdBy: user._id });
    if (!spreadDoc) {
      return { success: false, message: "No spread values found for this admin" };
    }
    return { success: true, spreadValues: spreadDoc.spreadValues };
  } catch (error) {
    throw new Error("Error fetching spread values: " + error.message);
  }
};