import mongoose from "mongoose";
import { spotRateModel } from "../../model/spotRateSchema.js";

export const updateSpread = async (req, res) => {
  const { metal, type, value } = req.body;
  const { adminId } = req.params;
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
