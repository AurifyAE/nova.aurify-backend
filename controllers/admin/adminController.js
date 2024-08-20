import {
  userVerfication,
  getUsersForAdmin,
  addSpreadValue,
  getSpreadValues,
} from "../../helper/Admin/adminHelper.js";
import { createAppError } from "../../utils/errorHandler.js";
import bcrypt from "bcrypt";
import adminModel from "../../model/adminSchema.js";

export const userLoginController = async (req, res, next) => { // Include next here
  try {
    const { email, password } = req.body;
    const authLogin = await userVerfication(email);

    if (authLogin) {
      const encryptPassword = authLogin.password;
      const matchPassword = await bcrypt.compare(password, encryptPassword);

      if (!matchPassword) {
        throw createAppError("Incorrect password.", 401);
      }

      res.status(200).json({
        success: true,
        message: "Authentication successful.",
      });
    } else {
      throw createAppError("User not found.", 404);
    }
  } catch (error) {
    next(error); // Pass the error to the global error handler
  }
};

export const getAdminDataController = async (req, res, next) => {
  try {
    const { email } = req.query; // Get email from query parameters

    if (!email) {
      throw createAppError("Email parameter is required.", 400);
    }

    const adminData = await adminModel.findOne({ email: email }).select('-password'); // Find admin by email and exclude password

    if (!adminData) {
      throw createAppError("Admin data not found.", 404);
    }

    res.status(200).json({
      success: true,
      data: adminData,
    });
  } catch (error) {
    console.log('error error:', error.message);
    next(error); // Pass the error to the global error handler
  }
};

//Add BankDetails section
export const saveBankDetailsController = async (req, res, next) => {
  try {
    const { email, bankDetails } = req.body;
    console.log('haaaai', bankDetails);
    if (!email || !bankDetails) {
      return res.status(400).json({ success: false, message: "Email and bank details are required." });
    }

    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    // Push the new bank details to the bankDetails array
    admin.bankDetails.push(bankDetails);

    // Save the updated admin document
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Bank details saved successfully",
      data: admin.bankDetails
    });
  } catch (error) {
    console.log('Error saving bank details:', error.message);
    next(error);
  }
};

// Update bank details
export const updateBankDetailsController = async (req, res, next) => {
  try {
    const { email, bankDetails } = req.body;

    if (!email || !bankDetails) {
      return res.status(400).json({ success: false, message: "Email and bank details are required." });
    }

    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    // Find the index of the bank details to update
    const bankIndex = admin.bankDetails.findIndex(b => b.accountNumber === bankDetails.accountNumber);

    if (bankIndex === -1) {
      return res.status(404).json({ success: false, message: "Bank details not found." });
    }

    // Update the bank details
    admin.bankDetails[bankIndex] = { ...admin.bankDetails[bankIndex], ...bankDetails };

    // Save the updated admin document
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: admin.bankDetails
    });
  } catch (error) {
    console.error('Error updating bank details:', error.message);
    next(error);
  }
};


// Delete bank details
export const deleteBankDetailsController = async (req, res, next) => {
  try {
    const { email, accountNumber } = req.body;

    if (!email || !accountNumber) {
      return res.status(400).json({ success: false, message: "Email and account number are required." });
    }

    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    // Remove the bank details
    admin.bankDetails = admin.bankDetails.filter(b => b.accountNumber !== accountNumber);

    // Save the updated admin document
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Bank details deleted successfully",
      data: admin.bankDetails
    });
  } catch (error) {
    console.error('Error deleting bank details:', error.message);
    next(error);
  }
};


//Sidebar Features 
export const getAdminFeaturesController = async (req, res, next) => {
  try {
    const { email } = req.query; // Using query parameter for consistency with your frontend

    console.log('Received email:', email);

    if (!email) {
      return res.status(400).json({ success: false, message: "Email parameter is required." });
    }

    const admin = await adminModel.findOne({ email }).select('features');

    console.log('Found admin:', admin);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    // Assuming 'features' is an array in your admin document
    const features = admin.features || [];

    res.status(200).json({
      success: true,
      message: "Features fetched successfully",
      data: features
    });
  } catch (error) {
    console.error('Error fetching admin features:', error.message);
    next(error);
  }
};


export const fetchUsersForAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const response = await getUsersForAdmin(adminId);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const addCustomSpread = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { spreadValue } = req.body;
    const response = await addSpreadValue(adminId, spreadValue);
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