import adminModel from "../../model/adminSchema.js";
import shopModel from "../../model/shopSchema.js";
import { createAppError } from "../../utils/errorHandler.js";

// Add a new shop item
export const addShopItem = async (
  userName,
  name,
  type,
  purity,
  description,
  image
) => {
  try {
    if (
      !name ||
      !type ||
      purity === undefined ||
      purity === null ||
      !description ||
      !image
    ) {
      throw createAppError(
        "All fields (name, type, purity, description, image) are required.",
        400
      );
    }

    const admin = await adminModel.findOne({ userName });
    if (!admin) {
      throw createAppError("Admin not found.", 404);
    }

    let shopDoc = await shopModel.findOne({ createdBy: admin._id });

    if (shopDoc) {
      shopDoc.shops.push({ name, type, purity, description, image });
    } else {
      shopDoc = new shopModel({
        shops: [{ name, type, purity, description, image }],
        createdBy: admin._id,
      });
    }

    await shopDoc.save();
    return shopDoc;
  } catch (error) {
    console.error("Error saving shop document:", error);
    throw createAppError("Error adding shop item: " + error.message, 500);
  }
};

// Get all shop items for a specific admin
export const getAllShopItems = async (userName) => {
  try {
    const admin = await adminModel.findOne({ userName });
    if (!admin) {
      throw createAppError("Admin not found.", 404);
    }
    const shopItems = await shopModel
      .findOne({ createdBy: admin._id })
      .populate("createdBy", "userName");
    return shopItems;
  } catch (error) {
    throw createAppError("Error fetching shop items: " + error.message, 500);
  }
};

export const updateShopItem = async (userName, shopItemId, updatedData) => {
  try {
    const admin = await adminModel.findOne({ userName });
    if (!admin) {
      throw createAppError("Admin not found.", 404);
    }

    const updateObject = {};
    Object.keys(updatedData).forEach((key) => {
      updateObject[`shops.$.${key}`] = updatedData[key];
    });

    const result = await shopModel.findOneAndUpdate(
      { createdBy: admin._id, "shops._id": shopItemId },
      { $set: updateObject },
      { new: true }
    );

    if (!result) {
      throw createAppError("Shop item not found or update failed.", 404);
    }

    return result;
  } catch (error) {
    console.error("Detailed error in helper:", error);
    throw createAppError("Error updating shop item: " + error.message, 500);
  }
};

// Delete a shop item
export const deleteShopItem = async (userName, shopItemId) => {
  try {
    const admin = await adminModel.findOne({ userName });
    if (!admin) {
      throw createAppError("Admin not found.", 404);
    }

    const result = await shopModel.findOneAndUpdate(
      { createdBy: admin._id },
      {
        $pull: { shops: { _id: shopItemId } },
      },
      { new: true }
    );

    if (!result) {
      throw createAppError("Shop item not found or deletion failed.", 404);
    }

    return result;
  } catch (error) {
    throw createAppError("Error deleting shop item: " + error.message, 500);
  }
};
