import {
  getUsersForAdmin,
  fetchActiveDevice,
  adminVerfication,
  getUserData,addFCMToken
} from "../../helper/admin/adminHelper.js";
import { createAppError } from "../../utils/errorHandler.js";

import adminModel from "../../model/adminSchema.js";
import { verifyToken, generateToken } from "../../utils/jwt.js";
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
      await addFCMToken(email,fcmToken)
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
    next(error); // Pass the error to the global error handler
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
    const {success,message,users} = await getUsersForAdmin(adminId);
    if (!success) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(200).json({
      success: true,
      users,
      message: message
    });
  } catch (error) {
    next(error);
  }
};

export const fetchAdminDevice = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    const {success,message,activeDeviceCount} = await fetchActiveDevice(adminId);
    if (!success) {
      return res.status(404).json({
        success: false,
        message,
      });
    }
    return res.status(200).json({
      success: true,
      activeDeviceCount,
      message: message
    });
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