import adminModel from "../../model/adminSchema.js";

export const getCommodity = async (email) => {
    try {
      return await adminModel.findOne({ email });
    } catch (error) {
      console.error("Error in fetching Commodity:", error.message);
      throw new Error("fetching failed: " + error.message);
    }
  };

  
export const getMetals = async (userEmail) => {
    try {
      return await adminModel.findOne({ email: userEmail }).select("-password");
    } catch (error) {
      console.error("Error in finding the metals:", error.message);
      throw new Error("searching failed: " + error.message);
    }
  };
  