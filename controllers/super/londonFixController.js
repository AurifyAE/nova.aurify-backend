import {
  addLondonFix,
  getAllLondonFix,
  getLondonFixById,
  updateLondonFix,
  deleteLondonFix,
} from "../../helper/superAdmin/londonFixHelper.js";

export const addLondonFixController = async (req, res) => {
    try {
      const { success, londonFix, message } = await addLondonFix(req.body);
  
      if (!success) {
        return res.status(400).json({ // Changed from 204 to 400
          success: false,
          message: message,
        });
      }
  
      return res.status(200).json({
        success: true,
        londonFix: londonFix,
        message: "London Fix added/updated successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  };
  
export const getAllLondonFixController = async (req, res) => {
  const response = await getAllLondonFix();
  return res.status(response.success ? 200 : 400).json(response);
};

export const getLondonFixByIdController = async (req, res) => {
  const response = await getLondonFixById(req.params.id);
  return res.status(response.success ? 200 : 404).json(response);
};

export const updateLondonFixController = async (req, res) => {
    try {
     
      const { success, message, londonFix } = await updateLondonFix(req.params.id, req.body);
  
      if (!success) {
        return res.status(message.includes("not found") ? 404 : 400).json({
          success: false,
          message,
        });
      }
  
      return res.status(200).json({
        success: true,
        londonFix,
        message: "London Fix updated successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  };
  

export const deleteLondonFixController = async (req, res) => {
  const response = await deleteLondonFix(req.params.id);
  return res.status(response.success ? 200 : 404).json(response);
};
