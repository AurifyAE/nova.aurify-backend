import adminModel from "../../model/adminSchema.js";

export const getCommodity = async (userName) => {
    try {
      return await adminModel.findOne({ userName });
    } catch (error) {
      console.error("Error in fetching Commodity:", error.message);
      throw new Error("fetching failed: " + error.message);
    }
  };

  
export const getMetals = async (userName) => {
    try {
      return await adminModel.findOne({ userName: userName }).select("-password");
    } catch (error) {
      console.error("Error in finding the metals:", error.message);
      throw new Error("searching failed: " + error.message);
    }
  };
  