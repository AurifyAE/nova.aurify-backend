import {
    addShopItem,
    getAllShopItems,
    updateShopItem,
    deleteShopItem
} from "../../helper/admin/shopHelper.js";
import fs from "fs";

// Add a new shop item
export const createShopItem = async (req, res) => {
    try {
        const { name, type, weight, rate } = req.body;
        console.log("emaill", req.query.email);
        const { email } = req.query;

        // Multer stores the image file information in req.file
        const image = req.file ? `/uploads/${req.file.filename}` : null;

        if (image == null) {
            throw createAppError("image is not find", 400);
        }
        const imageBase64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
        const img = `data:${req.file.mimetype};base64,${imageBase64}`;

        // Pass the image path instead of the base64 string to the helper function
        const newShopItem = await addShopItem(email, name, type, weight, rate, img);
        res.status(201).json(newShopItem);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// Get all shop items for a specific admin
export const fetchShopItems = async (req, res) => {
    try {
        const { email } = req.query;
        const shopItems = await getAllShopItems(email);
        res.status(200).json(shopItems);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// Update a shop item
export const editShopItem = async (req, res) => {
    try {
        const { email } = req.query;
        const { id: shopItemId } = req.params;
        let updatedData = req.body;

        // Check if a new image was uploaded
        if (req.file) {
            const imageBase64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
            const img = `data:${req.file.mimetype};base64,${imageBase64}`;
            updatedData = { ...updatedData, image: img };
        }

        const updatedShopItem = await updateShopItem(email, shopItemId, updatedData);
        res.status(200).json(updatedShopItem);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// Delete a shop item
export const removeShopItem = async (req, res) => {
    try {
        const { email } = req.query;
        const { id: shopItemId } = req.params;
        const result = await deleteShopItem(email, shopItemId);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};