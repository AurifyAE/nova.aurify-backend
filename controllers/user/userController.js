import {
  requestPassInAdmin,
  updateUserPassword,
  userVerification,
  getAdminProfile,
  addFCMToken,
  getVideoBannerDetails,
} from "../../helper/user/userHelper.js";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";
import { UsersModel } from "../../model/usersSchema.js";
import adminModel from "../../model/adminSchema.js";
import { CategoryModel } from "../../model/categorySchema.js";

export const userLoginController = async (req, res, next) => {
  try {
    const { contact, password, token } = req.body;
    const { adminId } = req.params;

    const response = await userVerification(adminId, contact, password);

    if (!response.success) {
      return res
        .status(401)
        .json({ message: response.message, success: false });
    }

    const userId = response.userId;

    const user = await UsersModel.aggregate([
      { $unwind: "$users" },
      { $match: { "users.contact": contact } },
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
          _id: 0,
          "users.name": 1,
          "users.email": 1,
          "users.contact": 1,
          "users.address": 1,
          "users.categoryId": 1,
          "users.cashBalance": 1,
          "users.goldBalance": 1,
          "users.categoryName": 1,
        },
      },
    ]);

    if (!user || user.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    const userDetails = user[0].users;
   
    await addFCMToken(userDetails._id, token);

    res.status(200).json({
      message: response.message,
      success: response.success,
      userId: response.userId,
      userDetails,
      
    });
  } catch (error) {
    next(error);
  }
};

export const fetchProductCount = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    if (!categoryId) {
      return res.status(400).json({ message: "Category ID is required", success: false });
    }

    const category = await CategoryModel.findById(categoryId).select("products");
    const productCount = category ? category.products.length : 0;

    res.status(200).json({
      success: true,
      productCount,
    });
  } catch (error) {
    next(error);
  }
};

export const getVideoBanner = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { success, banners, message } = await getVideoBannerDetails(adminId);

    if (!success) {
      return res.status(204).json({
        success: false,
        message,
      });
    }

    return res.status(200).json({
      success: true,
      banners,
      message: "VideoBanner fetching successfully",
    });
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
