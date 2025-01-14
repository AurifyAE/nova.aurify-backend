import mongoose from "mongoose";
import { getMetals } from "../../helper/admin/spotRateHelper.js";
import { spotRateModel } from "../../model/spotRateSchema.js";
import { createAppError } from "../../utils/errorHandler.js";
import { getCommodity } from "../../helper/admin/adminHelper.js";


export const updateCommodity = async (req, res, next) => {
  try {
    const { adminId, commodityId } = req.params;
    const commodity  = req.body;
    // Update the specific commodity within the commodities array
    const updatedSpotRate = await spotRateModel.findOneAndUpdate(
      { createdBy: adminId, 'commodities._id': commodityId },
      { 
        $set: { 
          'commodities.$': {
            metal: commodity.metal,
            purity: commodity.purity,
            unit: commodity.unit,
            weight: commodity.weight,
            _id: commodityId,
            buyPremium: commodity.buyPremium,
            sellPremium: commodity.sellPremium,
            buyCharge: commodity.buyCharge,
            sellCharge: commodity.sellCharge
          } 
        }
      },
      { new: true }
    );

    if (!updatedSpotRate) {
      return res.status(404).json({ message: 'SpotRate or commodity not found' });
    }

    res.status(200).json({ message: 'Commodity updated successfully', data: updatedSpotRate });
  } catch (error) {
    console.error('Error updating commodity:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


  export const deleteSpotRateCommodity = async (req, res, next) => {
    try {
      const { adminId, commodityId } = req.params;
  
      // Update the spot rate document by removing the specific commodity
      const result = await spotRateModel.updateOne(
        { createdBy: adminId }, 
        { $pull: { commodities: { _id: commodityId } } }
      );
  
      if (result.nModified === 0) {
        return res.status(404).json({ message: 'Commodity not found or already deleted' });
      }
  
      res.status(200).json({ message: 'Commodity deleted successfully' });
    } catch (error) {
      console.error('Error deleting commodity:', error);
      res.status(500).json({ error: 'An error occurred while deleting the commodity' });
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
      const userName = req.params.userName;
      if (!userName) {
        throw createAppError("userName parameter is required.", 400);
      }
  
      const commodityData = await getCommodity(userName);
  
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
          .status(204)
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
      const userName = req.params.userName;
      if (!userName) {
        throw createAppError("Id is required.", 400);
      }
  
      const metalData = await getMetals(userName);
  
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
  