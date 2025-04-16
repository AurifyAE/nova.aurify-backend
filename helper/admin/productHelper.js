import mongoose from "mongoose";
import Product from "../../model/productSchema.js";
import { createAppError } from "../../utils/errorHandler.js";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";

export const createProductHelper = async (productData) => {
  try {
    const {
      title,
      description,
      images,
      price,
      addedBy,
      addedByUser,
      weight,
      purity,
      sku,
      type,
    } = productData;

  
    // Validate SKU uniqueness
    const skuExists = await Product.findOne({ sku });
    if (skuExists) {
      throw createAppError("SKU already exists", 400);
    }

    const product = new Product({
      title,
      description,
      images: images || [], // Default empty array if no images are uploaded
      price,
      addedBy: addedBy || null,
      addedByUser: addedByUser || null,
      weight,
      purity,
      stock: true, // Default stock status
      sku,
      type: type || "GOLD", // Default tag if not provided
    });

    await product.save();
    return product; // Return the created product
  } catch (error) {
    // Propagate structured errors
    if (error.isOperational) throw error;

    // For unexpected errors, wrap them in a generic error response
    throw createAppError(`Error creating product: ${error.message}`, 500);
  }
};

export const updateProductHelper = async (productId, updateData) => {
  try {
    // Check if SKU is unique
    if (updateData.sku) {
      const skuExists = await Product.findOne({
        sku: updateData.sku,
        _id: { $ne: productId },
      });

      if (skuExists) {
        throw createAppError("SKU already exists", 400);
      }
    }

    // Update the product
    const result = await Product.updateOne(
      { _id: productId },
      { $set: updateData },
      { runValidators: true }
    );

    if (result.modifiedCount === 0) {
      throw createAppError("Product not found or no changes made", 404);
    }

    // Return the updated product
    return await Product.findById(productId);
  } catch (error) {
    if (error.isOperational) throw error;

    throw createAppError(`Error updating product: ${error.message}`, 500);
  }
};


// Delete a product (soft delete)
export const deleteProductHelper = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw createAppError("Product not found", 404);
    }
    product.stock = !product.stock;
    await product.save();
    return { message: "Product marked as deleted successfully" };
  } catch (error) {
    if (error.isOperational) throw error;

    throw createAppError(`Error deleting product: ${error.message}`, 500);
  }
};


export const fetchAllProductHelper = async (adminId) => {
  try {
    // Fetch all products from the database
    const products = await Product.find({addedBy:adminId});

    if (!products || products.length === 0) {
      throw createAppError("No products found", 404);
    }

    return products; // Return all products
  } catch (error) {
    if (error.isOperational) throw error;

    throw createAppError(`Error fetching products: ${error.message}`, 500);
  }
};


export const addProductDetailHelper = async (userSpotRateId, productDetail) => {
  try {
    const userSpotRate = await UserSpotRateModel.findById(userSpotRateId);
    if (!userSpotRate) {
      throw new Error("UserSpotRate not found");
    }
    const isProductExists = userSpotRate.products.some(
      (product) => product.productId.toString() === productDetail.productId
    );

    if (isProductExists) {
      throw createAppError("Product already exists in this userSpotRate", 400);
    }
    userSpotRate.products.push(productDetail);

    const updatedUserSpotRate = await userSpotRate.save();
    return updatedUserSpotRate;
  } catch (error) {
    throw error
  }
};



