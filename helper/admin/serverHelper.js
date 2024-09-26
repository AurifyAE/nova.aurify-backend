import { serverModel } from "../../model/serverSchema.js";

export const fetchServer = async () => {
    try {
      return await serverModel.findOne();
  
    } catch (error) {
      console.error("Error in fetching server:", error.message); 
      throw new Error("fetching failed: " + error.message);
    }
  };