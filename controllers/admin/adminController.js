import {
  adminVerfication,
  userVerfication,
  userCollectionSave,
  userUpdateSpread,
  updateNotification,
} from "../../helper/Admin/adminHelper.js";
import { createAppError } from "../../utils/errorHandler.js";
import bcrypt from "bcrypt";
import { getUserData } from "../../helper/Admin/adminHelper.js";
import { updateUserData } from "../../helper/Admin/adminHelper.js";
import { updateUserLogo } from  "../../helper/Admin/adminHelper.js";
import { spotRateModel } from "../../model/spotRateSchema.js";
import { getCommodity } from "../../helper/Admin/adminHelper.js";
import { getMetals } from "../../helper/Admin/adminHelper.js"
import mongoose from "mongoose";

export const adminLoginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const authLogin = await adminVerfication(email);

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
    next(error);
  }
};

export const registerUser = async (req, res, next) => {
  try {
    const { userName, contact, location, email, password } = req.body;
    const { adminId } = req.params;
    const data = {
      userName,
      contact,
      location,
      email,
      password,
    };
    const response = await userCollectionSave(data, adminId);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};

export const userLoginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { adminId } = req.params;
    const response = await userVerfication(adminId, email, password);
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
    const { spread } = req.body;
    const response = await userUpdateSpread(adminId, userId, spread);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
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
    console.log('Error:', error.message);
    next(error); // Pass the error to the global error handler
  }
};



export const updateAdminProfileController = async (req, res, next) => {
  try {
    const { id } = req.params; // Get ID from URL parameters
    const { email, fullName, mobile, location } = req.body; // Get updated data from request body

    console.log('Request body:', req.body); // Log the request body
    console.log('URL parameters:', req.params); // Log the URL parameters

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
  const { userId, metal, type, spread } = req.body;

  try {
    const createdBy = new mongoose.Types.ObjectId(userId);
    console.log(createdBy);
    let spotRate = await spotRateModel.findOne({ createdBy });

    if (!spotRate) {
      // If no document exists for this user, create a new one
      spotRate = new spotRateModel({
        createdBy,
      });
    }

    // Update the appropriate field based on metal and type
    const fieldName = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}Spread`;
    const updateObj = { [fieldName]: spread };
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


export const updateCommodity = async (req, res, next) => {
  try {
    const { userId, commodity } = req.body;
    const spotrate = await spotRateModel.findOne({ createdBy: userId });
    if (!spotrate) {
      return res.status(404).json({ message: 'Spotrate not found for this user' });
    }
    spotrate.commodities.push(commodity);
    await spotrate.save();
    res.status(200).json({ message: 'Spotrate commodity updated successfully' });
  } catch (error) {
    console.error('Error updating spotrate commodity:', error);
    res.status(500).json({ message: 'Internal server error' });
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
    console.log('user : ', userEmail);
    if (!userEmail) {
      throw createAppError("Id is required.", 400);
    }

    const metalData = await getMetals(userEmail);
    console.log(metalData);

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