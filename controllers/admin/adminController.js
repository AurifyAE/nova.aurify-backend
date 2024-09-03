import {
  getUsersForAdmin,
  addSpreadValue,
  getSpreadValues,
  deleteSpreadValue,
} from "../../helper/admin/adminHelper.js";
import { createAppError } from "../../utils/errorHandler.js";
import bcrypt from "bcrypt";
import { getUserData } from "../../helper/admin/adminHelper.js";
import { updateUserData } from "../../helper/admin/adminHelper.js";
import { updateUserLogo } from "../../helper/admin/adminHelper.js";
import { spotRateModel } from "../../model/spotRateSchema.js";
import { getCommodity } from "../../helper/admin/adminHelper.js";
import { getMetals } from "../../helper/admin/adminHelper.js";
import {
  fetchNotification,
  addFCMToken,
  updateNotification,
} from "../../helper/admin/adminHelper.js";
import adminModel from "../../model/adminSchema.js";
import {
  adminVerfication,
  userCollectionSave,
} from "../../helper/admin/adminHelper.js";
import { verifyToken, generateToken } from "../../utils/jwt.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { decryptPassword } from "../../utils/crypto.js";

export const adminLoginController = async (req, res, next) => {
  try {
    const { email, password, fcmToken, rememberMe } = req.body;

    const authLogin = await adminVerfication(email);

    if (authLogin) {
      const decryptedPassword = decryptPassword(
        authLogin.password,
        authLogin.passwordAccessKey
      );
      if (password !== decryptedPassword) {
        throw createAppError("Incorrect password.", 401);
      }

      await addFCMToken(email, fcmToken);

      const expiresIn = rememberMe ? "30d" : "3d";

      const token = generateToken({ adminId: authLogin._id }, expiresIn);

      res.status(200).json({
        success: true,
        message: "Authentication successful.",
        token,
      });
    } else {
      throw createAppError("User not found.", 404);
    }
  } catch (error) {
    next(error);
  }
};

export const adminTokenVerificationApi = async (req, res, next) => {
  try {
    const token = req.body.token;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Authentication token is missing" });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    const admin = await adminModel.findById(decoded.adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const currentDate = new Date();
    const serviceEndDate = new Date(admin.serviceEndDate);

    if (serviceEndDate < currentDate) {
      return res.status(403).json({
        message:
          "Your service has ended. Please renew to continue using the system.",
        serviceExpired: true,
      });
    }

    const reminderDate = new Date(
      serviceEndDate.getTime() - 7 * 24 * 60 * 60 * 1000
    ); // 7 days before expiration
    if (currentDate >= reminderDate && currentDate < serviceEndDate) {
      return res.status(200).json({
        admin: {
          adminId: admin._id,
          serviceEndDate: admin.serviceEndDate,
        },
        serviceExpired: false,
        reminderMessage:
          "Your service is about to expire in less than a week. Please renew soon.",
      });
    }

    res.status(200).json({
      admin: {
        adminId: admin._id,
        serviceEndDate: admin.serviceEndDate,
      },
      serviceExpired: false,
      reminderMessage: null,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token has expired", tokenExpired: true });
    } else if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ message: "Invalid token", tokenInvalid: true });
    }
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { adminId, notificationId } = req.params;
    const response = await updateNotification(adminId, notificationId);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};

export const getAdminDataController = async (req, res, next) => {
  try {
    const userEmail = req.params.email;
    if (!userEmail) {
      throw createAppError("email parameter is required.", 400);
    }

    const adminData = await getUserData(userEmail);

    if (!adminData) {
      throw createAppError("Admin data not found.", 404);
    }

    res.status(200).json({
      success: true,
      data: adminData,
    });
  } catch (error) {
    console.log("Error:", error.message);
    next(error); // Pass the error to the global error handler
  }
};

export const updateAdminProfileController = async (req, res, next) => {
  try {
    const { id } = req.params; // Get ID from URL parameters
    const { email, fullName, mobile, location } = req.body; // Get updated data from request body

    if (!id) {
      throw createAppError("ID parameter is required.", 400);
    }

    const updateAdminData = await updateUserData(
      id,
      email,
      fullName,
      mobile,
      location
    );
    // Find the admin by ID and update the fields

    if (!updateAdminData) {
      throw createAppError("Admin not found.", 404);
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updateAdminData,
    });
  } catch (error) {
    console.log("Error updating profile:", error.message);
    next(error); // Pass the error to the global error handler
  }
};

export const updateLogo = async (req, res) => {
  try {
    const { email } = req.body;
    const logoName = req.file.filename;

    // Update the user's logo in the database
    const updatedUser = await updateUserLogo(email, logoName);
    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "Logo updated successfully",
      data: { logo: logoName },
    });
  } catch (error) {
    console.error("Error updating logo:", error);
    res.status(500).json({ success: false, message: "Error updating logo" });
  }
};

export const updateSpread = async (req, res) => {
  const { adminId, metal, type, value } = req.body;

  try {
    const createdBy = new mongoose.Types.ObjectId(adminId);
    let spotRate = await spotRateModel.findOne({ createdBy });

    if (!spotRate) {
      // If no document exists for this user, create a new one
      spotRate = new spotRateModel({
        createdBy,
      });
    }

    // Update the appropriate field based on metal and type
    let fieldName;
    if (type === "bid" || type === "ask") {
      fieldName = `${metal.toLowerCase()}${
        type.charAt(0).toUpperCase() + type.slice(1)
      }Spread`;
    } else if (type === "low" || type === "high") {
      fieldName = `${metal.toLowerCase()}${
        type.charAt(0).toUpperCase() + type.slice(1)
      }Margin`;
    } else {
      return res.status(400).json({ message: "Invalid type specified" });
    }
    const updateObj = { [fieldName]: value };
    const updatedSpotRate = await spotRateModel.findOneAndUpdate(
      { createdBy },
      { $set: updateObj },
      { new: true, upsert: true, runValidators: false }
    );
    if (!updatedSpotRate) {
      return res
        .status(404)
        .json({ message: "SpotRate not found and could not be created" });
    }

    res
      .status(200)
      .json({ message: "Spread updated successfully", data: updatedSpotRate });
  } catch (error) {
    console.error("Error updating spread:", error);
    res.status(500).json({ message: "Error updating spread" });
  }
};

export const getCommodityController = async (req, res, next) => {
  try {
    const userEmail = req.params.email;
    if (!userEmail) {
      throw createAppError("email parameter is required.", 400);
    }

    const commodityData = await getCommodity(userEmail);

    if (!commodityData) {
      throw createAppError("Admin data not found.", 404);
    }

    res.status(200).json({
      success: true,
      data: commodityData,
    });
  } catch (error) {
    console.log("Error:", error.message);
    next(error); // Pass the error to the global error handler
  }
};

export const getSpotRate = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const createdBy = new mongoose.Types.ObjectId(adminId);
    const spotRates = await spotRateModel.findOne({ createdBy });
    if (!spotRates) {
      return res
        .status(404)
        .json({ message: "Spot rates not found for this user" });
    }

    res.json(spotRates);
  } catch (error) {
    console.error("Error fetching spot rates:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createCommodity = async (req, res, next) => {
  try {
    const { adminId, commodity } = req.body;
    const createdBy = new mongoose.Types.ObjectId(adminId);
    let spotrate = await spotRateModel.findOne({ createdBy });

    if (!spotrate) {
      // If no document exists for this user, create a new one
      spotrate = new spotRateModel({
        createdBy,
      });
    }
    spotrate.commodities.push(commodity);
    const updatedSpotrate = await spotrate.save();
    res
      .status(200)
      .json({
        message: "Commodity created successfully",
        data: updatedSpotrate,
      });
  } catch (error) {
    console.error("Error creating commodity:", error);
    res
      .status(500)
      .json({ message: "Error creating commodity", error: error.message });
  }
};

export const getMetalCommodity = async (req, res, next) => {
  try {
    const userEmail = req.params.email;
    if (!userEmail) {
      throw createAppError("Id is required.", 400);
    }

    const metalData = await getMetals(userEmail);

    if (!metalData) {
      throw createAppError("Metal data not found.", 404);
    }

    res.status(200).json({
      success: true,
      data: metalData,
    });
  } catch (error) {
    console.log("Error:", error.message);
    next(error); // Pass the error to the global error handler
  }
};

export const getNotification = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      throw createAppError("User ID is required.", 400);
    }

    const response = await fetchNotification(adminId);

    res.status(200).json({
      message: response.message,
      success: response.success,
      data: response.data, // If there's data returned, include it
    });
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    next(error);
  }
};

export const saveBankDetailsController = async (req, res, next) => {
  try {
    const { email, bankDetails } = req.body;
    if (!email || !bankDetails) {
      return res.status(400).json({
        success: false,
        message: "Email and bank details are required.",
      });
    }

    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    // // Push the new bank details to the bankDetails array
    // admin.bankDetails.push(bankDetails);

    // // Save the updated admin document
    // await admin.save();
    await adminModel.updateOne({ email }, { $push: { bankDetails } });

    res.status(200).json({
      success: true,
      message: "Bank details saved successfully",
      data: admin.bankDetails,
    });
  } catch (error) {
    console.log("Error saving bank details:", error.message);
    next(error);
  }
};

// Update bank details
export const updateBankDetailsController = async (req, res, next) => {
  try {
    const { email, bankDetails } = req.body;

    if (!email || !bankDetails) {
      return res.status(400).json({
        success: false,
        message: "Email and bank details are required.",
      });
    }

    // Find the admin by email
    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    // Find the bank details by account number
    const bankIndex = admin.bankDetails.findIndex(
      (b) => b.accountNumber === bankDetails.accountNumber
    );

    if (bankIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Bank details not found." });
    }

    // Update the specific bank details
    admin.bankDetails[bankIndex] = {
      ...admin.bankDetails[bankIndex],
      ...bankDetails,
    };

    // Save the updated admin document
    const updatedAdmin = await admin.save();

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: updatedAdmin.bankDetails[bankIndex],
    });
  } catch (error) {
    console.error("Error updating bank details:", error.message);
    next(error);
  }
};

// Delete bank details
export const deleteBankDetailsController = async (req, res, next) => {
  try {
    const { email, accountNumber } = req.body;

    if (!email || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: "Email and account number are required.",
      });
    }

    // Attempt to remove the bank detail
    const result = await adminModel.updateOne(
      { email },
      { $pull: { bankDetails: { accountNumber } } }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Admin or bank detail not found." });
    }

    res.status(200).json({
      success: true,
      message: "Bank detail deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting bank detail:", error.message);
    next(error);
  }
};



export const fetchUsersForAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    console.log(adminId)
    const response = await getUsersForAdmin(adminId);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const addCustomSpread = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { spreadValue, title } = req.body;
    const response = await addSpreadValue(adminId, spreadValue, title);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const fetchSpreadValues = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const response = await getSpreadValues(adminId);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteSpreadValueController = async (req, res, next) => {
  try {
    const { spreadValueId } = req.params;
    const { email } = req.query; 
    const result = await deleteSpreadValue(email, spreadValueId);
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    next(error);
  }
};


//Sidebar Features
export const getAdminFeaturesController = async (req, res, next) => {
  try {
    const { email } = req.query; // Using query parameter for consistency with your frontend

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email parameter is required." });
    }

    const admin = await adminModel.findOne({ email }).select("features");

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    // Assuming 'features' is an array in your admin document
    const features = admin.features || [];

    res.status(200).json({
      success: true,
      message: "Features fetched successfully",
      data: features,
    });
  } catch (error) {
    console.error("Error fetching admin features:", error.message);
    next(error);
  }
};