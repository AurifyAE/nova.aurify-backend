// import { addShopItem, getAllShopItems, updateShopItem, deleteShopItem } from "../../helper/admin/shopHelper";


// // Add a new shop item
// export const createShopItem = async (req, res) => {
//     try {
//         const { name, type, weight, rate, image } = req.body;
//         const { email } = req.user;
//         const newShopItem = await addShopItem(email, name, type, weight, rate, image);
//         res.status(201).json(newShopItem);
//     } catch (error) {
//         res.status(error.statusCode || 500).json({ message: error.message });
//     }
// };

// // Get all shop items for a specific admin
// export const fetchShopItems = async (req, res) => {
//     try {
//         const { email } = req.user;
//         const shopItems = await getAllShopItems(email);
//         res.status(200).json(shopItems);
//     } catch (error) {
//         res.status(error.statusCode || 500).json({ message: error.message });
//     }
// };

// // Update a shop item
// export const editShopItem = async (req, res) => {
//     try {
//         const { email } = req.user;
//         const { id: shopItemId } = req.params;
//         const updatedData = req.body;
//         const updatedShopItem = await updateShopItem(email, shopItemId, updatedData);
//         res.status(200).json(updatedShopItem);
//     } catch (error) {
//         res.status(error.statusCode || 500).json({ message: error.message });
//     }
// };

// // Delete a shop item
// export const removeShopItem = async (req, res) => {
//     try {
//         const { email } = req.user;
//         const { id: shopItemId } = req.params;
//         const result = await deleteShopItem(email, shopItemId);
//         res.status(200).json(result);
//     } catch (error) {
//         res.status(error.statusCode || 500).json({ message: error.message });
//     }
// };