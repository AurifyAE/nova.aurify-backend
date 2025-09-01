import {
  createProductHelper,
  updateProductHelper,
  deleteProductHelper,
  fetchAllProductHelper,
} from "../../helper/admin/productHelper.js";
import Product from "../../model/productSchema.js";
import { createAppError } from "../../utils/errorHandler.js";
import { deleteMultipleS3Files } from "../../utils/s3Utils.js";

// Create a new product
export const createProduct = async (req, res, next) => {
  try {
    const { adminId, userId } = req.query;
    if (!adminId && !userId) {
      throw createAppError("Either adminId or userId is required", 400);
    }
    const productData = req.body;
    const imageData = req.files.map((file) => ({
      url: file.location, // S3 URL
      key: file.key, // S3 Key
    }));
    productData.images = imageData;
    if (adminId) {
      productData.addedBy = adminId;
    }
    if (userId) {
      productData.addedByUser = userId;
    }
    const product = await createProductHelper(productData);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error); // Pass error to global error handler
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    if (req.files?.length > 0) {
      const newImages = req.files.map((file) => ({
        url: file.location,
        key: file.key,
      }));

      const oldImageKeys = existingProduct.images.map((img) => img.key);
      await deleteMultipleS3Files(oldImageKeys);
      updateData.images = newImages;
    }
    const updatedProduct = await updateProductHelper(id, updateData);
    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

// Delete product (soft delete)
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteProductHelper(id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const fetchAllProductData = async (req, res, next) => {
  try {
    const adminId = req.params.adminId;
    const result = await fetchAllProductHelper(adminId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
