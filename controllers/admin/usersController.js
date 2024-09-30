import bcrypt from "bcrypt";
import { UsersModel } from "../../model/UsersSchema.js";

const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    throw new Error("Error hashing password");
  }
};

export const addUser = async (req, res) => {
  try {
    const { adminId } = req.params;
    const userData = req.body;
    console.log("adminId:", adminId);
    console.log("----->", userData);

    if (
      !userData.name ||
      !userData.contact ||
      !userData.location ||
      !userData.category ||
      !userData.password
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    const existingAdmin = await UsersModel.findOne({ createdBy: adminId });

    if (existingAdmin) {
      // Check if the contact already exists
      const contactExists = existingAdmin.users.some(
        (user) => user.contact === userData.contact
      );

      if (contactExists) {
        return res.status(400).json({
          success: false,
          message: "User with this contact already exists",
        });
      }

      // Add new user to existing document
      existingAdmin.users.push({ ...userData, password: hashedPassword });
      await existingAdmin.save();
    } else {
      // Create new document with the first user
      const newUsers = new UsersModel({
        createdBy: adminId,
        users: [{ ...userData, password: hashedPassword }],
      });
      await newUsers.save();
    }

    // Don't send back the hashed password
    const { password, ...userDataWithoutPassword } = userData;

    res.status(201).json({
      success: true,
      message: "User added successfully",
      user: userDataWithoutPassword,
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({
      success: false,
      message: "Error adding user",
      error: error.message,
    });
  }
};

export const editUser = async (req, res) => {
  try {
    const { adminId, userId } = req.params;
    const updatedUserData = req.body;

    // If password is being updated, hash it
    if (updatedUserData.password) {
      updatedUserData.password = await hashPassword(updatedUserData.password);
    }

    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId, "users._id": userId },
      { $set: { "users.$": updatedUserData } },
      { new: true }
    );

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const updatedUser = result.users.find(
      (user) => user._id.toString() === userId
    );

    // Remove password from the response
    const { password, ...userDataWithoutPassword } = updatedUser.toObject();

    res.json({
      success: true,
      message: "User updated successfully",
      user: userDataWithoutPassword,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { adminId, userId } = req.params;

    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId },
      { $pull: { users: { _id: userId } } },
      { new: true }
    );

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { adminId } = req.params;

    const usersDoc = await UsersModel.findOne({ createdBy: adminId });

    if (!usersDoc) {
      return res.json({ success: true, users: [] });
    }

    res.json({ success: true, users: usersDoc.users });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};
