import {
  getNewsByAdminId,
  getSportrate,
  requestPassInAdmin,
  updateUserPassword,
  userUpdateSpread,
  userVerification,
  getAdminProfile,
} from "../../helper/user/userHelper.js";
import adminModel from "../../model/adminSchema.js";
import DiscountModel from "../../model/discountSchema.js";
import PremiumModel from "../../model/premiumSchema.js";
import { serverModel } from "../../model/serverSchema.js";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";
import { UsersModel } from "../../model/usersSchema.js";

export const userLoginController = async (req, res, next) => {
  try {
    const { contact, password } = req.body;
    const { adminId } = req.params;

    //  Verify user credentials
    const response = await userVerification(adminId, contact, password);

    if (response.success) {
      const userId = response.userId;

      //  Fetch user data, particularly the category
      const user = await UsersModel.findOne(
        {
          "users._id": userId,
        },
        { "users.$": 1 } // Correct usage of positional operator to select the specific user
      );

      // Check if user is found
      if (!user || user.users.length === 0) {
        return res.status(404).json({ message: "User not found", success: false });
      }

      // Access the user details from the retrieved user object
      const userDetails = user.users[0]; // Assuming only one user can be found with this ID
      const categoryId = userDetails.category; // Fetch category from userDetails

      //  Fetch user spot rate based on the user's category and adminId
      const userSpotRate = await UserSpotRateModel.findOne({
        createdBy: adminId, // Match the adminId
        "categories.categoryId": categoryId, // Match the categoryId
      }, {
        "categories.$": 1 // Use projection to only fetch the matched category
      });

      // Check if user spot rate is found
      if (!userSpotRate || !userSpotRate.categories.length) {
        return res.status(404).json({ message: "User spot rate not found", success: false });
      }

      // Access the matched category details
      const matchedCategory = userSpotRate.categories[0]; // Get the first matched category

      //  Respond with the fetched data
      res.status(200).json({
        message: response.message,
        success: response.success,
        userId: response.userId,
        userSpotRate: matchedCategory, // Include only the fetched spot rate for the matched category
      });
    } else {
      res.status(401).json({ message: "Login failed", success: false });
    }
  } catch (error) {
    next(error);
  }
};


export const getProfile = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const response = await getAdminProfile(adminId);
    res
      .status(200)
      .json({
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

export const updateSpread = async (req, res, next) => {
  try {
    const { adminId, userId } = req.params;
    const { spread, title } = req.body;
    const response = await userUpdateSpread(adminId, userId, spread, title);
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
export const getSpotrateDetails = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { success, fetchSpotRate } = await getSportrate(adminId);

    if (!success || !fetchSpotRate) {
      return res.status(204).json({
        success: false,
        message: "SpotRate data not found",
      });
    }

    return res.status(200).json({
      success: true,
      info: fetchSpotRate,
      message: "Fetching SpotRate successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getServerDetails = async (req, res, next) => {
  try {
    const serverInfo = await serverModel.findOne(
      {},
      "selectedServerName selectedServerURL"
    );

    if (!serverInfo) {
      return res.status(204).json({
        success: false,
        message: "No server information found",
      });
    }

    return res.status(200).json({
      success: true,
      info: {
        serverURL: serverInfo.selectedServerURL,
        serverName: serverInfo.selectedServerName,
      },
      message: "Fetching ServerURL & ServerName successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentNews = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { success, news, message } = await getNewsByAdminId(adminId);

    if (!success) {
      return res.status(204).json({
        success: false,
        message,
      });
    }

    return res.status(200).json({
      success: true,
      news,
      message: "News fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getCommodities = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const adminData = await adminModel.findById(adminId, "commodities.symbol");
    if (!adminData) {
      return res.status(204).json({
        success: false,
        message: "Admin not found",
      });
    }
    const commoditySymbols = adminData.commodities.map((commodity) =>
      commodity.symbol.toUpperCase()
    );
    return res.status(200).json({
      success: true,
      commodities: commoditySymbols,
      message: "Commodities fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Function to fetch premium and discount data
export const getPremiumDiscounts = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    const premiums = await PremiumModel.findOne({ createdBy: adminId });
    const discounts = await DiscountModel.findOne({ createdBy: adminId });

    let premiumDiscounts = [];

    // Fetch all premium entries
    if (premiums) {
      premiumDiscounts = premiumDiscounts.concat(
        premiums.premium.map((sub) => ({
          _id: sub._id,
          type: "Premium",
          value: sub.value,
          time: sub.timestamp,
        }))
      );
    }

    // Fetch all discount entries
    if (discounts) {
      premiumDiscounts = premiumDiscounts.concat(
        discounts.discount.map((sub) => ({
          _id: sub._id,
          type: "Discount",
          value: sub.value,
          time: sub.timestamp,
        }))
      );
    }

    // Sort by time in descending order
    premiumDiscounts.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json(premiumDiscounts); // Return all premium and discount entries
  } catch (error) {
    console.error("Error in fetching:", error);
    res.status(500).json({ message: "Server error" });
  }
};
