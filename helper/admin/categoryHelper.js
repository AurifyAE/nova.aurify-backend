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
    throw error
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
