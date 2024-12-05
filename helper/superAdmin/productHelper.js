import mongoose from "mongoose";
import Product from "../../model/productSchema.js";
import SubCategory from "../../model/subCategoryModel.js";
import { createAppError } from "../../utils/errorHandler.js";

export const createProductHelper = async (productData) => {
  try {
    const {
      title,
      description,
      images,
      price,
      subCategory,
      addedBy,
      weight,
      purity,
      sku,
      tags,
    } = productData;

    // Validate if the subcategory exists
    const subCategoryExists = await SubCategory.findById(subCategory);
    if (!subCategoryExists) {
      throw createAppError("SubCategory not found", 404);
    }

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
      subCategory,
      addedBy,
      weight,
      purity,
      stock: true, // Default stock status
      sku,
      tags: tags || "New Arrival", // Default tag if not provided
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

// Update a product
export const updateProductHelper = async (productId, updateData) => {
  try {
    // Check if SKU exists (unique constraint)
    if (updateData.sku) {
      const skuExists = await Product.findOne({
        sku: updateData.sku,
        _id: { $ne: productId },
      });

      if (skuExists) {
        throw createAppError("SKU already exists", 400);
      }
    }

    // Perform the update operation
    const result = await Product.updateOne(
      { _id: productId }, // Filter
      { $set: updateData }, // Update fields
      { runValidators: true } // Ensure schema validations are applied
    );

    if (result.modifiedCount === 0) {
      throw createAppError("Product not found or no changes made", 404);
    }

    // Fetch the updated product for returning
    const updatedProduct = await Product.findById(productId);
    return updatedProduct;
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

    product.stock = false; // Mark the product as deleted (soft delete)
    await product.save();
    return { message: "Product marked as deleted successfully" };
  } catch (error) {
    if (error.isOperational) throw error;

    throw createAppError(`Error deleting product: ${error.message}`, 500);
  }
};


// export const fetchProductHelper = async (mainCategoryId) => {
//   try {
//     if (!mainCategoryId) {
//       throw new Error("Main category ID is required");
//     }

//     const subCategories = await SubCategory.find(
//       { mainCategory: mainCategoryId },
//       "_id"
//     );

//     if (!subCategories || subCategories.length === 0) {
//       throw new Error("No subcategories found for the given main category");
//     }

//     const subCategoryIds = subCategories.map((sub) => sub._id);

//     const result = await mongoose.model("Product").aggregate([
//       {
//         $match: {
//           subCategory: { $in: subCategoryIds },
//         },
//       },
//       {
//         $lookup: {
//           from: "subcategories",
//           localField: "subCategory",
//           foreignField: "_id",
//           as: "subCategoryDetails",
//         },
//       },
//       {
//         $unwind: {
//           path: "$subCategoryDetails",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "maincategories",
//           localField: "subCategoryDetails.mainCategory",
//           foreignField: "_id",
//           as: "mainCategoryDetails",
//         },
//       },
//       {
//         $unwind: {
//           path: "$mainCategoryDetails",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           title: 1,
//           description: 1,
//           images: 1,
//           price: 1,
//           weight: 1,
//           purity: 1,
//           stock: 1,
//           tags: 1,
//           sku: 1,
//           subCategoryDetails: {
//             _id: "$subCategoryDetails._id",
//             name: "$subCategoryDetails.name",
//             description: "$subCategoryDetails.description",
//           },
//           mainCategoryDetails: {
//             _id: "$mainCategoryDetails._id",
//             name: "$mainCategoryDetails.name",
//             description: "$mainCategoryDetails.description",
//             image: "$mainCategoryDetails.image",
//           },
//           createdAt: 1,
//           updatedAt: 1,
//         },
//       },
//     ]);

//     return { success: true, result };
//   } catch (error) {
//     return {
//       success: false,
//       message: "Error fetching product details: " + error.message,
//     };
//   }
// };


export const fetchProductHelper = async () => {
  try {
    // Fetch all products from the database
    const products = await Product.find();

    if (!products || products.length === 0) {
      throw createAppError("No products found", 404);
    }

    return products; // Return all products
  } catch (error) {
    if (error.isOperational) throw error;

    throw createAppError(`Error fetching products: ${error.message}`, 500);
  }
};