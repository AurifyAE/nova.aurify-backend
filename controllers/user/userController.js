import {
  requestPassInAdmin,
  updateUserPassword,
  userVerification,
  getAdminProfile,
  addFCMToken,
} from "../../helper/user/userHelper.js";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";
import { UsersModel } from "../../model/usersSchema.js";
import adminModel from "../../model/adminSchema.js";
export const userLoginController = async (req, res, next) => {
  try {
    const { contact, password, token } = req.body;
    const { adminId } = req.params;

    // Verify user credentials
    const response = await userVerification(adminId, contact, password);
    
    if (response.success) {
      const userId = response.userId;

      // Fetch user data, including the category name
      const user = await UsersModel.aggregate([
        { $unwind: "$users" },
        { $match: { "users.contact": contact } }, // Match user by contact
        {
          $lookup: {
            from: "categories",
            localField: "users.categoryId",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        { $unwind: "$categoryDetails" },
        {
          $addFields: {
            "users.categoryName": "$categoryDetails.name",
          },
        },
        {
          $project: {
            _id: 1,
            createdBy: 1,
            users: 1,
          },
        },
      ]);

      if (!user || user.length === 0) {
        return res.status(404).json({ message: "User not found", success: false });
      }

      const userDetails = user[0].users;

      // Call FCM token function after successful login
      await addFCMToken(userDetails._id, token);

      // Fetch user spot rate based on category and adminId
      const userSpotRate = await UserSpotRateModel.findOne(
        {
          createdBy: adminId,
          "categories.categoryId": userDetails.categoryId,
        },
        { "categories.$": 1 }
      );

      if (!userSpotRate || !userSpotRate.categories.length) {
        return res.status(404).json({ message: "User spot rate not found", success: false });
      }

      const matchedCategory = userSpotRate.categories[0];

      // Respond with user data
      res.status(200).json({
        message: response.message,
        success: response.success,
        userId: response.userId,
        userDetails: userDetails,
        userSpotRate: matchedCategory,
      });
    } else {
      res.status(401).json({ message: response.message, success: response.success, });
    }
  } catch (error) {
    next(error);
  }
};
export const getProfile = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const response = await getAdminProfile(adminId);
    res.status(200).json({
      message: response.message,
      success: response.success,
      info: response.data,
    });
  } catch (error) {
    next(error);
  }
};
export const forgotPassword = async (req, res, next) => {
  try {
    const { contact, password } = req.body;
    const { adminId } = req.params;
    const response = await updateUserPassword(adminId, contact, password);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};
export const requestAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { request } = req.body;
    const response = await requestPassInAdmin(adminId, request);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};
export const fetchAdminBankDetails = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const adminData = await adminModel.findById(adminId, "bankDetails");
    if (!adminData) {
      return res.status(204).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      bankInfo: adminData,
      message: "Fetch banking details successfully",
    });
  } catch (error) {
    next(error);
  }
};