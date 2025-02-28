import {
  addFCMToken,
  getUsersForAdmin,
  adminVerfication,
  getUserData,
  findAdminByUserName,
  updateBankDetails,
  removeBankDetail,
  addBankDetails,
} from "../../helper/admin/adminHelper.js";
import { createAppError } from "../../utils/errorHandler.js";
import { verifyToken, generateToken } from "../../utils/jwt.js";
import { decryptPassword } from "../../utils/crypto.js";
import adminModel from "../../model/adminSchema.js";
import jwt from "jsonwebtoken";
import { deleteS3File } from "../../utils/s3Utils.js";
export const adminLoginController = async (req, res, next) => {
  try {
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
      await addFCMToken(userName, fcmToken);
      const expiresIn = rememberMe ? "30d" : "3d";
      const adminId = authLogin._id;
      console.log(adminId);
      const token = generateToken({ adminId: authLogin._id }, expiresIn);

      res.status(200).json({
        success: true,
        message: "Authentication successful.",
        token,
        adminId: adminId,
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
      const bankDetails  = req.body;
      if (!bankDetails.userName ) {
        return res.status(400).json({
          success: false,
          message: "userName and bank details are required.",
        });
      }
  
      const admin = await findAdminByUserName(bankDetails.userName);
      if (!admin) {
        return res.status(204).json({ success: false, message: "Admin not found." });
      }
  
      // Handle file upload
      if (req.file) {
        bankDetails.logo = req.file.location;
        bankDetails.awsS3Key = req.file.key;
      }
  
      await addBankDetails(bankDetails.userName, bankDetails);
  
      res.status(200).json({
        success: true,
        message: "Bank details saved successfully",
        data: bankDetails,
      });
    } catch (error) {
      console.log("Error saving bank details:", error.message);
      next(error);
    }
  };
  

  export const updateBankDetailsController = async (req, res, next) => {
    try {
      const { userName, bankDetailId, ...updatedFields } = req.body;
  
      if (!userName || !bankDetailId) {
        return res.status(400).json({
          success: false,
          message: "userName and bankDetailId are required.",
        });
      }
  
      const admin = await findAdminByUserName(userName);
      if (!admin) {
        return res.status(404).json({ success: false, message: "Admin not found." });
      }
  
      // Find the existing bank detail by _id
      const existingBank = admin.bankDetails.find(
        (b) => b._id.toString() === bankDetailId
      );
  
      if (!existingBank) {
        return res.status(404).json({ success: false, message: "Bank details not found." });
      }
  
      // If the admin uploads a new logo, handle S3 file deletion and update
      if (req.file) {
        if (existingBank.awsS3Key) {
          await deleteS3File(existingBank.awsS3Key);
        }
        updatedFields.logo = req.file.location;
        updatedFields.awsS3Key = req.file.key;
      }
  
      // Update only the provided fields
      const updatedAdmin = await updateBankDetails(userName, bankDetailId, updatedFields);
  
      res.status(200).json({
        success: true,
        message: "Bank details updated successfully.",
        data: updatedAdmin.bankDetails.find((b) => b._id.toString() === bankDetailId),
      });
    } catch (error) {
      console.error("Error updating bank details:", error.message);
      next(error);
    }
  };
  
  
  

  export const deleteBankDetailsController = async (req, res, next) => {
    try {
      const { userName, bankDetailId } = req.body;
      if (!userName || !bankDetailId) {
        return res.status(400).json({
          success: false,
          message: "userName and bankDetailId are required.",
        });
      }
  
      const admin = await findAdminByUserName(userName);
      if (!admin) {
        return res.status(204).json({ success: false, message: "Admin not found." });
      }
  
      // Find the bank detail by _id
      const bankToDelete = admin.bankDetails.find(
        (b) => b._id.toString() === bankDetailId
      );
  
      if (!bankToDelete) {
        return res.status(204).json({ success: false, message: "Bank details not found." });
      }
  
      // Delete logo from S3 if exists
      if (bankToDelete.awsS3Key) {
        await deleteS3File(bankToDelete.awsS3Key);
      }
  
      // Remove from DB using _id
      const result = await removeBankDetail(userName, bankDetailId);
      if (result.modifiedCount === 0) {
        return res.status(404).json({ success: false, message: "Failed to delete bank detail." });
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
  