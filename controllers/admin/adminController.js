import {
  addFCMToken,
  getUsersForAdmin,
  fetchActiveDevice,
  adminVerfication,
  getUserData
} from "../../helper/admin/adminHelper.js";
import { createAppError } from "../../utils/errorHandler.js";
import PremiumModel from "../../model/premiumSchema.js";
import DiscountModel from "../../model/discountSchema.js";


import adminModel from "../../model/adminSchema.js";
import { verifyToken, generateToken } from "../../utils/jwt.js";
import jwt from "jsonwebtoken";
import { decryptPassword } from "../../utils/crypto.js";

export const adminLoginController = async (req, res, next) => {
  try {
    console.log("first")
    const { userName, password, fcmToken, rememberMe } = req.body;
    const authLogin = await adminVerfication(userName);
    if (authLogin) {
      const decryptedPassword = decryptPassword(
        authLogin.password,
        authLogin.passwordAccessKey
      );
      if (password !== decryptedPassword) {
        throw createAppError("Incorrect password.", 401);
      }
      await addFCMToken(userName,fcmToken)
      const expiresIn = rememberMe ? "30d" : "3d";
      const adminId = authLogin._id
      console.log(adminId)
      const token = generateToken({ adminId: authLogin._id }, expiresIn);
       
      res.status(200).json({
        success: true,
        message: "Authentication successful.",
        token,
        adminId: adminId
      });
    } else {
      throw createAppError("User not found.", 204);
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
    const userName = req.params.userName;
    if (!userName) {
      throw createAppError("userName parameter is required.", 400);
    }

    const adminData = await getUserData(userName);
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
    const { userName, bankDetails } = req.body;
    if (!userName || !bankDetails) {
      return res.status(400).json({
        success: false,
        message: "userName and bank details are required.",
      });
    }

    const admin = await adminModel.findOne({ userName });

    if (!admin) {
      return res
        .status(204)
        .json({ success: false, message: "Admin not found." });
    }

    await adminModel.updateOne({ userName }, { $push: { bankDetails } });

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
    const { userName, bankDetails } = req.body;

    if (!userName || !bankDetails) {
      return res.status(400).json({
        success: false,
        message: "userName and bank details are required.",
      });
    }

    // Find the admin by userName
    const admin = await adminModel.findOne({ userName });

    if (!admin) {
      return res
        .status(204)
        .json({ success: false, message: "Admin not found." });
    }

    // Find the bank details by account number
    const bankIndex = admin.bankDetails.findIndex(
      (b) => b.accountNumber === bankDetails.accountNumber
    );

    if (bankIndex === -1) {
      return res
        .status(204)
        .json({ success: false, message: "Bank details not found." });
    }
    // Update the specific bank details-
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
    const { userName, accountNumber } = req.body;

    if (!userName || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: "userName and account number are required.",
      });
    }

    // Attempt to remove the bank detail
    const result = await adminModel.updateOne(
      { userName },
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
      return res.status(204).json({
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

    const { success, message, activeDeviceCount } = await fetchActiveDevice(adminId);
    
    // Always return success: true, even if no devices are found
    return res.status(200).json({
      success: true,
      activeDeviceCount,
      message: message || "Devices fetched successfully",
    });
    
  } catch (error) {
    next(error);  // Pass the error to the global error handler
  }
};


//Sidebar Features
export const getAdminFeaturesController = async (req, res, next) => {
  try {
    const { userName } = req.query; // Using query parameter for consistency with your frontend

    if (!userName) {
      return res
        .status(400)
        .json({ success: false, message: "userName parameter is required." });
    }

    const admin = await adminModel.findOne({ userName }).select("features email");

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found." });
    }

    // Assuming 'features' is an array in your admin document
    const features = admin.features || [];
    const email = admin.email || "";

    res.status(200).json({
      success: true,
      message: "Features and email fetched successfully",
      data: { features, email },
    });
  } catch (error) {
    console.error("Error fetching admin features and email:", error.message);
    next(error);
  }
};



export const premiumDiscounts = async (req, res, next) => {
  try {
      const { userId } = req.params;
      const { type, value, time } = req.body;
  
      if (!type || !value || isNaN(value) || value === 0) {
        return res.status(400).json({ message: 'Invalid data' });
      }
  
      const timestamp = new Date(time).getTime();
  
      let premiumDiscounts;
      if (type === 'Premium') {
        premiumDiscounts = await PremiumModel.findOneAndUpdate(
          { createdBy: userId },
          { 
            $push: { 
              premium: { 
                timestamp, 
                value: Number(value) 
              } 
            } 
          },
          { new: true, upsert: true }
        );
      } else if (type === 'Discount') {
        premiumDiscounts = await DiscountModel.findOneAndUpdate(
          { createdBy: userId },
          { 
            $push: { 
              discount: { 
                timestamp, 
                value: Number(value) 
              } 
            } 
          },
          { new: true, upsert: true }
        );
      } else {
        return res.status(400).json({ message: 'Invalid type' });
      }
  
      const newPremiumDiscounts = premiumDiscounts[type.toLowerCase()].slice(-1)[0];
  
      res.status(201).json({
        message: 'added successfully',
        premiumDiscounts: {
          _id: newPremiumDiscounts._id,
          type,
          value: newPremiumDiscounts.value,
          time: new Date(newPremiumDiscounts.timestamp).toLocaleString()
        }
      });
    } catch (error) {
      console.error('Error in adding', error);
      res.status(500).json({ message: 'Server error' });
    }
};

export const getPremiumDiscounts = async (req, res, next) => {
  try {
      const { userId } = req.params;
  
      const premiums = await PremiumModel.findOne({ createdBy: userId });
      const discounts = await DiscountModel.findOne({ createdBy: userId });
  
      let premiumDiscounts = [];
      if (premiums) {
        premiumDiscounts = premiumDiscounts.concat(
          premiums.premium.map(sub => ({
            _id: sub._id,
            type: 'Premium',
            value: sub.value,
            time: new Date(sub.timestamp).toLocaleString()
          }))
        );
      }
      if (discounts) {
        premiumDiscounts = premiumDiscounts.concat(
          discounts.discount.map(sub => ({
            _id: sub._id,
            type: 'Discount',
            value: sub.value,
            time: new Date(sub.timestamp).toLocaleString()
          }))
        );
      }
  

      premiumDiscounts.sort((a, b) => new Date(b.time) - new Date(a.time));
  
      res.json({ premiumDiscounts });
    } catch (error) {
      console.error('Error in fetching:', error);
      res.status(500).json({ message: 'Server error' });
    }
};