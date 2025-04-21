import mongoose from "mongoose";
import { CategoryModel } from "../../model/categorySchema.js";
import { createAppError } from "../../utils/errorHandler.js";

export const checkCategoryExists = async (name, adminId) => {
  return await CategoryModel.findOne({ name, createdBy: adminId });
};

export const addProductDetailHelper = async (categoryId, productDetail) => {
  try {
    const category = await CategoryModel.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    const isProductExists = category.products.some(
      (product) => product.productId.toString() === productDetail.productId
    );

    if (isProductExists) {
      throw createAppError("Product already exists in this category", 400);
    }
    category.products.push(productDetail);

    const updatedCategory = await category.save();
    return updatedCategory;
  } catch (error) {
    throw error;
  }
};

export const createCategory = async (name, adminId) => {
  const existingCategory = await checkCategoryExists(name, adminId);
  if (existingCategory) {
    throw createAppError("Category with this name already exists", 400);
  }

  const newCategory = new CategoryModel({ name, createdBy: adminId });
  return await newCategory.save();
};

export const updateCategory = async (id, adminId, name) => {
  const existingCategory = await checkCategoryExists(name, adminId);
  if (existingCategory) {
    throw createAppError("Category with this name already exists", 400);
  }

  const updatedCategory = await CategoryModel.findOneAndUpdate(
    { _id: id, createdBy: adminId },
    { $set: { name } },
    { new: true }
  );

  if (!updatedCategory) {
    throw createAppError("Category not found or unauthorized", 404);
  }

  return updatedCategory;
};

export const deleteCategoryById = async (id, adminId) => {
  const deletedCategory = await CategoryModel.findOneAndDelete({
    _id: id,
    createdBy: adminId,
  });

  if (!deletedCategory) {
    throw createAppError("Category not found or unauthorized", 404);
  }

  return deletedCategory;
};

export const getAllCategories = async (adminId) => {
  const categories = await CategoryModel.find({ createdBy: adminId });

  if (!categories.length) {
    throw createAppError("No categories found", 404);
  }

  return categories;
};

export const findCategoryById = async (categoryId) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw createAppError("Invalid category ID format", 400);
  }

  const category = await CategoryModel.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(categoryId) } },
    {
      $lookup: {
        from: "products",
        localField: "products.productId",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    {
      $addFields: {
        products: {
          $map: {
            input: "$products",
            as: "product",
            in: {
              $mergeObjects: [
                "$$product",
                {
                  details: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$productDetails",
                          as: "pd",
                          cond: { $eq: ["$$pd._id", "$$product.productId"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    { $project: { productDetails: 0 } },
  ]);

  if (!category || category.length === 0) {
    throw createAppError("Category not found", 404);
  }

  return category[0];
};

export const updateProductInCategories = async (
  categoryId,
  productDetailId,
  updateData
) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw createAppError("Invalid category ID format", 400);
  }

  const category = await CategoryModel.findById(categoryId);
  if (!category) {
    throw createAppError("Category not found", 404);
  }

  const productIndex = category.products.findIndex(
    (p) => p._id.toString() === productDetailId
  );

  if (productIndex === -1) {
    throw createAppError("Product not found in category", 404);
  }

  // Update only the fields provided in updateData
  Object.keys(updateData).forEach((key) => {
    if (key !== "_id" && key !== "productId") {
      // Prevent updating immutable fields
      category.products[productIndex][key] = updateData[key];
    }
  });

  await category.save();
  return category;
};

export const removeProductFromCategory = async (
  categoryId,
  productDetailId
) => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw createAppError("Invalid category ID format", 400);
  }

  const category = await CategoryModel.findById(categoryId);
  if (!category) {
    throw createAppError("Category not found", 404);
  }

  const productIndex = category.products.findIndex(
    (p) => p._id.toString() === productDetailId
  );

  if (productIndex === -1) {
    throw createAppError("Product not found in category", 404);
  }

  // Remove the product at the found index
  category.products.splice(productIndex, 1);

  await category.save();
  return category;
};
