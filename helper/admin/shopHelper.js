import shopModel from "../../model/shopSchema.js";
import adminModel from '../../model/adminSchema.js';
import { createAppError } from '../../utils/errorHandler.js';

// Add a new shop item
export const addShopItem = async (email, name, type, weight, rate, image) => {
    try {
        console.log("emailll", email, name, type);

        const admin = await adminModel.findOne({ email });

        if (!admin) {
            throw createAppError("Admin not found.", 404);
        }

        let shopDoc = await shopModel.findOne({ createdBy: admin._id });

        if (shopDoc) {
            // If a document exists, push the new shop item into the shops array
            shopDoc.shops.push({ name, type, weight, rate, image });
        } else {
            // If no document exists, create a new shop document
            shopDoc = new shopModel({
                shops: [{ name, type, weight, rate, image }],
                createdBy: admin._id,
            });
        }

        await shopDoc.save();
        return shopDoc;
    } catch (error) {
        throw createAppError("Error adding shop item: " + error.message, 500);
    }
};

// Get all shop items for a specific admin
export const getAllShopItems = async (email) => {
    try {
        const admin = await adminModel.findOne({ email });
        if (!admin) {
            throw createAppError("Admin not found.", 404);
        }
        const shopItems = await shopModel.findOne({ createdBy: admin._id }).populate('createdBy', 'userName');
        return shopItems;
    } catch (error) {
        throw createAppError("Error fetching shop items: " + error.message, 500);
    }
};

// Update a shop item
// export const updateShopItem = async (email, shopItemId, updatedData) => {
//     try {
//         console.log("Email:", email);
//         console.log("ShopItemId:", shopItemId);
//         console.log("UpdatedData:", updatedData);
//         const admin = await adminModel.findOne({ email });
//         if (!admin) {
//             throw createAppError("Admin not found.", 404);
//         }


//         const result = await shopModel.findOneAndUpdate(
//             { createdBy: admin._id, "shops._id": shopItemId },
//             {
//                 $set: {
//                     "shops.$.name": updatedData.name,
//                     "shops.$.type": updatedData.type,
//                     "shops.$.weight": updatedData.weight,
//                     "shops.$.rate": updatedData.rate,
//                     "shops.$.image": updatedData.image,
//                 }
//             },
//             { new: true }
//         );

//         if (!result) {
//             throw createAppError("Shop item not found or update failed.", 404);
//         }

//         return result;
//     } catch (error) {
//         console.error("Detailed error in helper:", error);

//         throw createAppError("Error updating shop item: " + error.message, 500);
//     }
// };

export const updateShopItem = async (email, shopItemId, updatedData) => {
    try {
        console.log("Email:", email);
        console.log("ShopItemId:", shopItemId);
        console.log("UpdatedData:", updatedData);

        const admin = await adminModel.findOne({ email });
        if (!admin) {
            throw createAppError("Admin not found.", 404);
        }

        const updateObject = {};
        Object.keys(updatedData).forEach(key => {
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
export const deleteShopItem = async (email, shopItemId) => {
    try {
        const admin = await adminModel.findOne({ email });
        if (!admin) {
            throw createAppError("Admin not found.", 404);
        }

        const result = await shopModel.findOneAndUpdate(
            { createdBy: admin._id },
            {
                $pull: { shops: { _id: shopItemId } }
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
