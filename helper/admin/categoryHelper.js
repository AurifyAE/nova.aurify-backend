import { CategoryModel } from "../../model/categorySchema.js";
import { createAppError } from "../../utils/errorHandler.js";

export const checkCategoryExists = async (name, adminId) => {
  return await CategoryModel.findOne({ name, createdBy: adminId });
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
