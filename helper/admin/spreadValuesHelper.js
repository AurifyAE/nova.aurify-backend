import adminModel from "../../model/adminSchema.js";
import { SpreadValueModel } from "../../model/spreadValueSchema.js";

export const addSpreadValue = async (adminEmail, spreadValue, title) => {
    try {
      const user = await adminModel.findOne({ email: adminEmail });
      if (!user) {
        return { success: false, message: "Admin not found" };
      }
  
      // Find the spread value document for this admin, or create a new one if it doesn't exist
      let spreadDoc = await SpreadValueModel.findOneAndUpdate(
        { createdBy: user._id },
        {
          $push: { spreadValues: { spreadValue, title } },
          $setOnInsert: { createdBy: user._id },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
  
      return {
        success: true,
        message: "Spread value added successfully",
        spreadDoc,
      };
    } catch (error) {
      console.error("Error adding spread value:", error);
      return { success: false, message: error.message };
    }
  };
  
  export const getSpreadValues = async (adminEmail) => {
    try {
      const user = await adminModel.findOne({ email: adminEmail });
      if (!user) {
        return null;
      }
      const spreadDoc = await SpreadValueModel.findOne({ createdBy: user._id });
      if (!spreadDoc) {
        return {
          success: false,
          message: "No spread values found for this admin",
        };
      }
      return { success: true, spreadValues: spreadDoc.spreadValues };
    } catch (error) {
      throw new Error("Error fetching spread values: " + error.message);
    }
  };
  
  export const deleteSpreadValue = async (adminEmail, spreadValueId) => {
    try {
      const user = await adminModel.findOne({ email: adminEmail });
      if (!user) {
        return { success: false, message: "Admin not found" };
      }
  
      const result = await SpreadValueModel.updateOne(
        { createdBy: user._id },
        { $pull: { spreadValues: { _id: spreadValueId } } }
      );
  
      if (result.modifiedCount > 0) {
        return { success: true, message: "Spread value deleted successfully" };
      } else {
        return {
          success: false,
          message: "Spread value not found or already deleted",
        };
      }
    } catch (error) {
      console.error("Error deleting spread value:", error);
      throw new Error("Error deleting spread value: " + error.message);
    }
  };
  