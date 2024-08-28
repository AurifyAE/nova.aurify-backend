import {
    addShopItem,
    getAllShopItems,
    updateShopItem,
    deleteShopItem
} from "../../helper/admin/shopHelper.js";


// Add a new shop item
export const createShopItem = async (req, res) => {
    // try {
    const { name, type, weight, rate } = req.body;
    console.log("emaill", req.query.email);
    const { email } = req.query;

    console.log("file", req.file);
    // Multer stores the image file information in req.file

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    if (image == null) {
        throw createAppError("image is not find", 400);
    }
    // const imageBase64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
    // const img = `data:${req.file.mimetype};base64,${imageBase64}`;
    const img = image;

    // Pass the image path instead of the base64 string to the helper function
    const newShopItem = await addShopItem(email, name, type, weight, rate, img);
    res.status(201).json(newShopItem);
    // } catch (error) {
    //     res.status(error.statusCode || 500).json({ message: error.message });
    // }
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
// export const editShopItem = async (req, res) => {
//     try {
//         console.log("Query:", req.query);
//         console.log("Params:", req.params);
//         console.log("Body:", req.body);
//         console.log("File:", req.file);
//         const { email } = req.query;
//         const { id: shopItemId } = req.params;
//         let updatedData = req.body;

//         // Convert weight and rate to numbers
//         if (updatedData.weight) {
//             updatedData.weight = parseFloat(updatedData.weight);
//         }
//         if (updatedData.rate) {
//             updatedData.rate = parseFloat(updatedData.rate);
//         }
//         // Check if a new image was uploaded
//         if (req.file) {
//             const imageBase64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
//             const img = `data:${req.file.mimetype};base64,${imageBase64}`;
//             updatedData = { ...updatedData, image: img };
//         }
//         console.log("Updated data before sending to helper:", updatedData);

//         const updatedShopItem = await updateShopItem(email, shopItemId, updatedData);
//         res.status(200).json(updatedShopItem);
//     } catch (error) {
//         console.error("Detailed error:", error);
//         res.status(error.statusCode || 500).json({ message: error.message });
//     }
// };

export const editShopItem = async (req, res) => {
    try {
        const { email } = req.query;
        const { id: shopItemId } = req.params;
        let updatedData = {};

        // Only include fields that are present and valid
        if (req.body.name) updatedData.name = req.body.name;
        if (req.body.type) updatedData.type = req.body.type;
        if (req.body.weight) updatedData.weight = parseFloat(req.body.weight) || 0;
        if (req.body.rate) updatedData.rate = parseFloat(req.body.rate) || 0;

        // Check if a new image was uploaded
        if (req.file) {
            updatedData.image = `/uploads/${req.file.filename}`;
        }

        console.log("Updated data before sending to helper:", updatedData);

        const updatedShopItem = await updateShopItem(email, shopItemId, updatedData);
        res.status(200).json(updatedShopItem);
    } catch (error) {
        console.error("Detailed error in controller:", error);
        res.status(error.statusCode || 500).json({ message: error.message, stack: error.stack });
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
