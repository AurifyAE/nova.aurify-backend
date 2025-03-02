// userHelper.js
import { UsersModel } from "../../model/usersSchema.js";
import { encryptPassword, decryptPassword } from "../../utils/crypto.js";
import mongoose from "mongoose";

class UserHelper {

  validateUserData(userData) {
    if (
      !userData.name ||
      !userData.contact ||
      !userData.email ||
      !userData.address ||
      !userData.categoryId ||
      !userData.password
    ) {
      return "All fields are required";
    }
    return true;
  }


  async checkUserExists(adminId, userData, excludeUserId = null) {
    const query = {
      createdBy: adminId,
      $or: []
    };
    
    if (userData.contact) {
      query.$or.push({ "users.contact": userData.contact });
    }
    
    if (userData.email) {
      query.$or.push({ "users.email": userData.email });
    }
    
    // If no fields to check, return false
    if (query.$or.length === 0) {
      return false;
    }
    
    // Exclude current user for updates
    if (excludeUserId) {
      query["users._id"] = { $ne: excludeUserId };
    }
    
    const existingUser = await UsersModel.findOne(query);
    return !!existingUser;
  }

  prepareUserData(userData) {
    const { iv, encryptedData } = encryptPassword(userData.password);
    
    return {
      ...userData,
      password: encryptedData,
      passwordAccessKey: iv,
      cashBalance: userData.cashBalance || 0,
      goldBalance: userData.goldBalance || 0
    };
  }


  async addUser(adminId, userData) {
    const newUserData = this.prepareUserData(userData);
    
    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId },
      { $push: { users: newUserData } },
      { new: true, upsert: true }
    );
    
    // Get the last added user
    const addedUser = result.users[result.users.length - 1];
    
    // Populate category info
    return this.getUserWithCategory(addedUser._id);
  }

 
  async getUserWithCategory(userId) {
    const objectId = new mongoose.Types.ObjectId(userId);
    
    const populatedUser = await UsersModel.aggregate([
      { $match: { "users._id": objectId } },
      { $unwind: "$users" },
      { $match: { "users._id": objectId } },
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
          address: "$users.address",
          categoryId: "$users.categoryId",
          categoryName: "$categoryInfo.name",
          cashBalance: "$users.cashBalance",
          goldBalance: "$users.goldBalance",
          pricingOption: "$users.pricingOption",
          discountAmount: "$users.discountAmount",
          premiumAmount: "$users.premiumAmount",
          makingCharge: "$users.makingCharge",
          createdAt: "$users.createdAt"
        },
      },
    ]);
    
    return populatedUser[0];
  }

 
  createUpdateObject(updatedUserData) {
    const updateObject = {};
    
    const fields = [
      'name', 'contact', 'email', 'location', 'categoryId', 
      'cashBalance', 'goldBalance', 'pricingOption', 
      'discountAmount', 'premiumAmount', 'makingCharge'
    ];
    
    fields.forEach(field => {
      if (updatedUserData[field] !== undefined) {
        updateObject[`users.$.${field}`] = updatedUserData[field];
      }
    });
    
    // If password is being updated, encrypt it
    if (updatedUserData.password) {
      const { iv, encryptedData } = encryptPassword(updatedUserData.password);
      updateObject["users.$.password"] = encryptedData;
      updateObject["users.$.passwordAccessKey"] = iv;
    }
    
    return updateObject;
  }

 
  async updateUser(adminId, userId, updatedUserData) {
    const updateObject = this.createUpdateObject(updatedUserData);
    
    // If no fields to update
    if (Object.keys(updateObject).length === 0) {
      throw new Error("At least one field must be updated");
    }
    
    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId, "users._id": userId },
      { $set: updateObject },
      { new: true }
    );
    
    if (!result) {
      throw new Error("User not found");
    }
    
    const updatedUser = result.users.find(
      (user) => user._id.toString() === userId
    );
    
    // Remove sensitive information
    const { password, passwordAccessKey, ...userWithoutSensitiveInfo } = updatedUser.toObject();
    
    return userWithoutSensitiveInfo;
  }

  
  async getAllUsers(adminId) {
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
          address: "$users.address",
          categoryId: "$users.categoryId",
          categoryName: "$categoryInfo.name",
          encryptedPassword: "$users.password",
          passwordAccessKey: "$users.passwordAccessKey",
          cashBalance: "$users.cashBalance",
          goldBalance: "$users.goldBalance",
          pricingOption: "$users.pricingOption",
          discountAmount: "$users.discountAmount",
          premiumAmount: "$users.premiumAmount",
          makingCharge: "$users.makingCharge",
          createdAt: "$users.createdAt"
        },
      },
    ]);
    
    // Decrypt passwords and remove sensitive information
    return users.map((user) => {
      try {
        if (user.encryptedPassword && user.passwordAccessKey) {
          const decryptedPassword = decryptPassword(
            user.encryptedPassword,
            user.passwordAccessKey
          );
          const { encryptedPassword, passwordAccessKey, ...sanitizedUser } = user;
          return { ...sanitizedUser, decryptedPassword };
        } else {
          const { encryptedPassword, passwordAccessKey, ...sanitizedUser } = user;
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
  }


  async deleteUser(adminId, userId) {
    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId },
      { $pull: { users: { _id: userId } } },
      { new: true }
    );
    
    if (!result) {
      throw new Error("User not found");
    }
    
    return true;
  }
}

export default new UserHelper();