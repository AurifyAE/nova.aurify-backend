import {
  getUsersForAdmin,
  addSpreadValue,
  getSpreadValues,
  deleteSpreadValue
} from "../../helper/admin/adminHelper.js";
import { createAppError } from "../../utils/errorHandler.js";
import bcrypt from "bcrypt";
import { getUserData } from "../../helper/admin/adminHelper.js";
import { updateUserData } from "../../helper/admin/adminHelper.js";
import { updateUserLogo } from  "../../helper/admin/adminHelper.js";
import { spotRateModel } from "../../model/spotRateSchema.js";
import { getCommodity } from "../../helper/admin/adminHelper.js";
import { getMetals } from "../../helper/admin/adminHelper.js"
import { fetchNotification, addFCMToken, updateNotification } from "../../helper/admin/adminHelper.js";
import adminModel from "../../model/adminSchema.js";
import { adminVerfication } from "../../helper/admin/adminHelper.js";
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'aurify@JWT';

export const adminLoginController = async (req, res, next) => {
  try {
    const { email, password,fcmToken } = req.body;
    const authLogin = await adminVerfication(email);

    if (authLogin) {
      const encryptPassword = authLogin.password;
      const matchPassword = await bcrypt.compare(password, encryptPassword);

      if (!matchPassword) {
        throw createAppError("Incorrect password.", 401);
      }
      await addFCMToken(email,fcmToken);    
      const token = jwt.sign({ userId: authLogin._id }, SECRET_KEY, { expiresIn: '1h' });

      res.status(200).json({
        success: true,
        message: "Authentication successful.",
        token
      });
    } else {
      throw createAppError("User not found.", 404);
    }
  } catch (error) {
    next(error);
  }
};

// export const registerUser = async (req, res, next) => {
//   try {
//     const { userName, contact, location, email, password } = req.body;
//     const { adminId } = req.params;
//     const data = {
//       userName,
//       contact,
//       location,
//       email,
//       password,
//     };
//     const response = await userCollectionSave(data, adminId);
//     res
//       .status(200)
//       .json({ message: response.message, success: response.success });
//   } catch (error) {
//     next(error);
//   }
// };

export const userLoginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { adminId } = req.params;
    const response = await adminVerfication(adminId, email, password);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};

// export const updateSpread = async (req, res, next) => {
//   try {
//     const { adminId, userId } = req.params;
//     const { spread } = req.body;
//     const response = await userUpdateSpread(adminId, userId, spread);
//     res
//       .status(200)
//       .json({ message: response.message, success: response.success });
//   } catch (error) {
//     next(error);
//   }
// };

export const deleteNotification = async (req, res, next) => {
  try {
    const { userId, notificationId } = req.params;
    const response = await updateNotification(userId, notificationId);
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
    console.log('Error:', error.message);
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

    const updateAdminData = await updateUserData(id, email, fullName, mobile, location);
    // Find the admin by ID and update the fields

    if (!updateAdminData) {
      throw createAppError("Admin not found.", 404);
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updateAdminData
    });

  } catch (error) {
    console.log('Error updating profile:', error.message);
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
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Logo updated successfully',
      data: { logo: logoName }
    });
  } catch (error) {
    console.error('Error updating logo:', error);
    res.status(500).json({ success: false, message: 'Error updating logo' });
  }
};

export const updateSpread = async (req, res) => {
  const { userId, metal, type, value   } = req.body;

  try {
    const createdBy = new mongoose.Types.ObjectId(userId);
    let spotRate = await spotRateModel.findOne({ createdBy });

    if (!spotRate) {
      // If no document exists for this user, create a new one
      spotRate = new spotRateModel({
        createdBy,
      });
    }

    // Update the appropriate field based on metal and type
    let fieldName;
    if (type === 'bid' || type === 'ask') {
      fieldName = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}Spread`;
    } else if (type === 'low' || type === 'high') {
      fieldName = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}Margin`;
    } else {
      return res.status(400).json({ message: 'Invalid type specified' });
    }
    const updateObj = { [fieldName]: value };
    const updatedSpotRate = await spotRateModel.findOneAndUpdate(
      { createdBy },
      { $set: updateObj },
      { new: true, upsert: true, runValidators: false }
    );
    if (!updatedSpotRate) {
      return res.status(404).json({ message: 'SpotRate not found and could not be created' });
    }

    res.status(200).json({ message: 'Spread updated successfully', data: updatedSpotRate });

  } catch (error) {
    console.error('Error updating spread:', error);
    res.status(500).json({ message: 'Error updating spread' });
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
    console.log('Error:', error.message);
    next(error); // Pass the error to the global error handler
  }
};

export const getSpotRate = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const spotRates = await spotRateModel.findOne({ createdBy: userId });
    
    if (!spotRates) {
      return res.status(404).json({ message: 'Spot rates not found for this user' });
    }
    
    res.json(spotRates);
  } catch (error) {
    console.error('Error fetching spot rates:', error);
    res.status(500).json({ message: 'Server error' });
  }

};


export const createCommodity = async (req, res, next) => {
  try {
    const { userId, commodity } = req.body;
    const createdBy = new mongoose.Types.ObjectId(userId);
    let spotrate = await spotRateModel.findOne({ createdBy });

    if (!spotrate) {
      // If no document exists for this user, create a new one
      spotrate = new spotRateModel({
        createdBy,
      });
    }
    spotrate.commodities.push(commodity);
    const updatedSpotrate = await spotrate.save();
    res.status(200).json({ message: 'Commodity created successfully', data: updatedSpotrate });
  } catch (error) {
    console.error('Error creating commodity:', error);
    res.status(500).json({ message: 'Error creating commodity', error: error.message });
  }
};

export const getSpotRateCommodity = async (req, res, next) => {
  try {
    const userId = req.params;
    if (!userId) {
      throw createAppError("email parameter is required.", 400);
    }

    const spotRateCommodity = await spotRateModel.findOne({ createdBy: userId });

    if (!spotRateCommodity) {
      throw createAppError("data not found.", 404);
    }

    res.status(200).json({
      success: true,
      data: adminData,
    });
  } catch (error) {
    console.log('Error:', error.message);
    next(error); // Pass the error to the global error handler
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
    console.log('Error:', error.message);
    next(error); // Pass the error to the global error handler
  }
};

export const getNotification = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw createAppError("User ID is required.", 400);
    }

    const response = await fetchNotification(userId);

    res.status(200).json({ 
      message: response.message, 
      success: response.success,
      data: response.data // If there's data returned, include it
    });
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    next(error);
  }
};

export const saveBankDetailsController = async (req, res, next) => {
  try {
    const { email, bankDetails } = req.body;
    if (!email || !bankDetails) {
      return res.status(400).json({ success: false, message: "Email and bank details are required." });
    }

    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    // // Push the new bank details to the bankDetails array
    // admin.bankDetails.push(bankDetails);

    // // Save the updated admin document
    // await admin.save();
    await adminModel.updateOne(
      { email },
      { $push: { bankDetails } }
    );

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

    // Directly update the bank details using the account number
    const updatedAdmin = await adminModel.findOneAndUpdate(
      { email, "bankDetails.accountNumber": bankDetails.accountNumber },
      { $set: { "bankDetails.$": bankDetails } },
      { new: true } // Return the updated document
    );

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: "Admin or bank details not found." });
    }

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: updatedAdmin.bankDetails.find(b => b.accountNumber === bankDetails.accountNumber)
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

    // Attempt to remove the bank detail
    const result = await adminModel.updateOne(
      { email },
      { $pull: { bankDetails: { accountNumber } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Admin or bank detail not found." });
    }

    res.status(200).json({
      success: true,
      message: "Bank detail deleted successfully."
    });
  } catch (error) {
    console.error('Error deleting bank detail:', error.message);
    next(error);
  }
};



//Sidebar Features 
export const getAdminFeaturesController = async (req, res, next) => {
  try {
    const { email } = req.query; // Using query parameter for consistency with your frontend

    if (!email) {
      return res.status(400).json({ success: false, message: "Email parameter is required." });
    }

    const admin = await adminModel.findOne({ email }).select('features');

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
    const { email } = req.query; // Assuming you'll send admin email as a query parameter

    const result = await deleteSpreadValue(email, spreadValueId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    next(error);
  }
};
