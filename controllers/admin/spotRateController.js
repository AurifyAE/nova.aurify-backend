import { createAppError } from "../../utils/errorHandler.js";
import { spotRateModel } from "../../model/spotRateSchema.js";
import mongoose from "mongoose";


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
  
  