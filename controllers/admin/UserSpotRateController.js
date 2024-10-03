import mongoose from "mongoose";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";
import { createAppError } from "../../utils/errorHandler.js";

export const getUserCommodity = async (req, res, next) => {
  try {
    const { adminId, categoryId } = req.params;
    const userSpotRate = await UserSpotRateModel.findOne({ createdBy: adminId });
    
    if (!userSpotRate) {
      return res.status(404).json({ message: 'User spot rate not found' });
    }

    const category = userSpotRate.categories.find(cat => cat.categoryId === categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching spot rates:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const updateUserSpread = async (req, res) => {
  try {
    const { adminId, categoryId, metal, type, value } = req.body;
    let userSpotRate = await UserSpotRateModel.findOne({ createdBy: adminId });

    if (!userSpotRate) {
      // Create a new UserSpotRate if it doesn't exist
      userSpotRate = new UserSpotRateModel({
        createdBy: adminId,
        categories: [{ categoryId }]
      });
    }

    let category = userSpotRate.categories.find(cat => cat.categoryId === categoryId);

    if (!category) {
      // Add a new category if it doesn't exist
      category = { categoryId };
      userSpotRate.categories.push(category);
    }

    const field = `${metal.toLowerCase()}${type.charAt(0).toUpperCase() + type.slice(1)}${type === 'low' || type === 'high' ? 'Margin' : 'Spread'}`;
    category[field] = value;

    await userSpotRate.save();

    res.json({ message: 'Spread updated successfully', data: category });
  } catch (error) {
    console.error('Error updating spread:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const addUserCommodity = async (req, res) => {
  try {
    const { adminId, categoryId } = req.params;
    let commodityData = req.body.commodity || req.body;

    let userSpotRate = await UserSpotRateModel.findOne({ createdBy: adminId });

    if (!userSpotRate) {
      userSpotRate = new UserSpotRateModel({
        createdBy: adminId,
        categories: [{ categoryId }]
      });
    }

    let category = userSpotRate.categories.find(cat => cat.categoryId === categoryId);
    
    if (!category) {
      category = { categoryId };
      userSpotRate.categories.push(category);
    }

    // Ensure all required fields are present
    const requiredFields = ['metal', 'purity', 'unit', 'weight'];
    const optionalFields = ['buyPremium', 'sellPremium', 'buyCharge', 'sellCharge'];
    const missingRequiredFields = requiredFields.filter(field => {
      const value = commodityData[field];
      return value === undefined || value === null || value === '';
    });

    if (missingRequiredFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing or empty required fields: ${missingRequiredFields.join(', ')}`,
        receivedData: commodityData
      });
    }

    // Set default values for optional fields if not provided
    optionalFields.forEach(field => {
      if (commodityData[field] === undefined) {
        commodityData[field] = 0;
      }
    });

    if (commodityData._id) {
      // Update existing commodity
      const commodityIndex = category.commodities.findIndex(c => c._id.toString() === commodityData._id);
      if (commodityIndex !== -1) {
        category.commodities[commodityIndex] = {
          ...category.commodities[commodityIndex].toObject(),
          ...commodityData
        };
      } else {
        return res.status(404).json({ message: 'Commodity not found' });
      }
    } else {
      // Add new commodity
      category.commodities.push(commodityData);
    }

    // Save the updated or new user spot rate
    await userSpotRate.save();

    res.json({ 
      message: 'Commodity added/updated successfully', 
      data: category,
      addedCommodity: commodityData
    });
  } catch (error) {
    console.error('Error adding/updating commodity:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: error.stack
    });
  }
};


export const deleteUserCommodity = async (req, res, next) => {
  try {
    const { adminId, categoryId, commodityId } = req.params;
    const userSpotRate = await UserSpotRateModel.findOne({ createdBy: adminId });

    if (!userSpotRate) {
      return res.status(404).json({ message: 'User spot rate not found' });
    }

    const category = userSpotRate.categories.find(cat => cat.categoryId === categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.commodities = category.commodities.filter(c => c._id.toString() !== commodityId);

    await userSpotRate.save();

    res.json({ message: 'Commodity deleted successfully', data: category });
  } catch (error) {
    console.error('Error deleting commodity:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCommodity = async (req, res, next) => {
  try {
    const { adminId, categoryId, commodity } = req.body;
    const createdBy = new mongoose.Types.ObjectId(adminId);

    const updatedUserSpotRate = await UserSpotRateModel.findOneAndUpdate(
      { 
        "categories.categoryId": categoryId,
        "categories.categoryData.createdBy": createdBy
      },
      { 
        $push: { 
          "categories.$[outer].categoryData.commodities": commodity
        }
      },
      {
        arrayFilters: [{ "outer.categoryId": categoryId }],
        new: true,
        upsert: true
      }
    );

    if (!updatedUserSpotRate) {
      return res.status(404).json({ message: "UserSpotRate not found and could not be created" });
    }

    res.status(200).json({
      message: "Commodity created successfully",
      data: updatedUserSpotRate,
    });
  } catch (error) {
    console.error("Error creating commodity:", error);
    res.status(500).json({ message: "Error creating commodity", error: error.message });
  }
};

