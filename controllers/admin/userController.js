import { UsersModel } from "../../model/usersSchema.js";
import { encryptPassword, decryptPassword } from "../../utils/crypto.js";
import mongoose from "mongoose";

export const addUser = async (req, res) => {
  try {
    const { adminId } = req.params;
    const userData = req.body;
    // Validate required fields
    if (
      !userData.name ||
      !userData.contact ||
      !userData.email || // Ensure email is provided
      !userData.location ||
      !userData.categoryId ||
      !userData.password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if user with the same contact or email already exists
    const existingUser = await UsersModel.findOne({
      createdBy: adminId,
      $or: [{ "users.contact": userData.contact }, { "users.email": userData.email }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this contact or email already exists",
      });
    }

    // Encrypt password
    const { iv, encryptedData } = encryptPassword(userData.password);

    // Ensure default values for cashBalance and goldBalance
    const newUserData = {
      ...userData,
      password: encryptedData,
      passwordAccessKey: iv,
      cashBalance: userData.cashBalance || 0, // Default to 0 if not provided
      goldBalance: userData.goldBalance || 0, // Default to 0 if not provided
    };

    // Insert new user
    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId },
      { $push: { users: newUserData } },
      { new: true, upsert: true }
    );

    // Get the last added user
    const addedUser = result.users[result.users.length - 1];

    // Populate the category name
    const populatedUser = await UsersModel.aggregate([
      { $match: { "users._id": addedUser._id } },
      { $unwind: "$users" },
      { $match: { "users._id": addedUser._id } },
      {
        $lookup: {
          from: "categories",
          localField: "users.categoryId",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      {
        $project: {
          _id: "$users._id",
          name: "$users.name",
          email: "$users.email",
          contact: "$users.contact",
          location: "$users.location",
          categoryId: "$users.categoryId",
          categoryName: "$categoryInfo.name",
          cashBalance: "$users.cashBalance",
          goldBalance: "$users.goldBalance",
        },
      },
    ]);

    res.status(201).json({
      success: true,
      message: "User added successfully",
      user: populatedUser[0],
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

    // Ensure at least one field is provided for update
    if (
      !updatedUserData.name &&
      !updatedUserData.contact &&
      !updatedUserData.email &&
      !updatedUserData.location &&
      !updatedUserData.categoryId &&
      !updatedUserData.password &&
      updatedUserData.cashBalance === undefined &&
      updatedUserData.goldBalance === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one field must be updated",
      });
    }

    // Check if another user has the same contact or email
    if (updatedUserData.contact || updatedUserData.email) {
      const existingUser = await UsersModel.findOne({
        createdBy: adminId,
        "users._id": { $ne: userId }, // Exclude current user
        $or: [
          { "users.contact": updatedUserData.contact },
          { "users.email": updatedUserData.email },
        ],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Another user already has this contact or email",
        });
      }
    }

    let updateObject = {};

    if (updatedUserData.name) updateObject["users.$.name"] = updatedUserData.name;
    if (updatedUserData.contact) updateObject["users.$.contact"] = updatedUserData.contact;
    if (updatedUserData.email) updateObject["users.$.email"] = updatedUserData.email;
    if (updatedUserData.location) updateObject["users.$.location"] = updatedUserData.location;
    if (updatedUserData.categoryId) updateObject["users.$.categoryId"] = updatedUserData.categoryId;
    if (updatedUserData.cashBalance !== undefined) updateObject["users.$.cashBalance"] = updatedUserData.cashBalance;
    if (updatedUserData.goldBalance !== undefined) updateObject["users.$.goldBalance"] = updatedUserData.goldBalance;

    // If password is being updated, encrypt it
    if (updatedUserData.password) {
      const { iv, encryptedData } = encryptPassword(updatedUserData.password);
      updateObject["users.$.password"] = encryptedData;
      updateObject["users.$.passwordAccessKey"] = iv;
    }

    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId, "users._id": userId },
      { $set: updateObject },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedUser = result.users.find((user) => user._id.toString() === userId);

    // Remove password and passwordAccessKey from the response
    const { password, passwordAccessKey, ...userWithoutSensitiveInfo } = updatedUser.toObject();

    res.json({
      success: true,
      message: "User updated successfully",
      user: userWithoutSensitiveInfo,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(400).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};


export const getUsers = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Convert adminId to ObjectId
    const objectIdAdminId = new mongoose.Types.ObjectId(adminId);

    const users = await UsersModel.aggregate([
      { $match: { createdBy: objectIdAdminId } },
      { $unwind: "$users" },
      {
        $lookup: {
          from: "categories",
          localField: "users.categoryId",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      {
        $project: {
          _id: "$users._id",
          name: "$users.name",
          email: "$users.email",
          contact: "$users.contact",
          location: "$users.location",
          categoryId: "$users.categoryId",
          categoryName: "$categoryInfo.name",
          encryptedPassword: "$users.password",
          passwordAccessKey: "$users.passwordAccessKey",
          cashBalance: "$users.cashBalance",
          goldBalance: "$users.goldBalance",
        },
      },
    ]);

    // Decrypt passwords and remove sensitive information
    const sanitizedUsers = users.map((user) => {
      try {
        if (user.encryptedPassword && user.passwordAccessKey) {
          const decryptedPassword = decryptPassword(
            user.encryptedPassword,
            user.passwordAccessKey
          );
          const { encryptedPassword, passwordAccessKey, ...sanitizedUser } =
            user;
          return { ...sanitizedUser, decryptedPassword };
        } else {
          const { encryptedPassword, passwordAccessKey, ...sanitizedUser } =
            user;
          return {
            ...sanitizedUser,
            decryptionFailed: true,
            reason: "Missing password or passwordAccessKey",
          };
        }
      } catch (decryptionError) {
        console.error(
          `Failed to decrypt password for user ${user._id}:`,
          decryptionError
        );
        const { encryptedPassword, passwordAccessKey, ...sanitizedUser } = user;
        return {
          ...sanitizedUser,
          decryptionFailed: true,
          reason: "Decryption error",
        };
      }
    });

    res.json({ success: true, users: sanitizedUsers });
  } catch (error) {
    console.error("Error in getUsers:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching users",
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
    res
      .status(400)
      .json({
        success: false,
        message: "Error deleting user",
        error: error.message,
      });
  }
};
