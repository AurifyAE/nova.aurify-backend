
import {
    addShopItem,
    deleteShopItem,
    getAllShopItems,
    updateShopItem
} from "../../helper/admin/shopHelper.js";
import { createAppError } from "../../utils/errorHandler.js";


// Add a new shop item
export const createShopItem = async (req, res) => {
    try {
      const { name, type, weight, rate } = req.body;
      const { userName } = req.params;
  
      const image = req.file ? req.file.location : null;
  
      if (image == null) {
        throw createAppError("Image is not found", 400);
      }
  
      // Pass the image path instead of the base64 string to the helper function
      const newShopItem = await addShopItem(userName, name, type, weight, rate, image);
      res.status(201).json(newShopItem);
    } catch (error) {
      console.error('Error in createShopItem:', error);
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  };

// Get all shop items for a specific admin
export const fetchShopItems = async (req, res) => {
    try {
        const { userName } = req.params;
        const shopItems = await getAllShopItems(userName);
        res.status(200).json(shopItems);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};



export const editShopItem = async (req, res) => {
    try {
        const { userName } = req.query;
        const { id: shopItemId } = req.params;
        let updatedData = {};

        // Only include fields that are present and valid
        if (req.body.name) updatedData.name = req.body.name;
        if (req.body.type) updatedData.type = req.body.type;
        if (req.body.weight) updatedData.weight = parseFloat(req.body.weight) || 0;
        if (req.body.rate) updatedData.rate = parseFloat(req.body.rate) || 0;

        // Check if a new image was uploaded
        if (req.file) {
            updatedData.image = req.file.location;
        }

        const updatedShopItem = await updateShopItem(userName, shopItemId, updatedData);
        res.status(200).json(updatedShopItem);
    } catch (error) {
        console.error("Detailed error in controller:", error);
        res.status(error.statusCode || 500).json({ message: error.message, stack: error.stack });
    }
};

// Delete a shop item
export const removeShopItem = async (req, res) => {
    try {
        const { userName } = req.query;
        const { id: shopItemId } = req.params;
        const result = await deleteShopItem(userName, shopItemId);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
