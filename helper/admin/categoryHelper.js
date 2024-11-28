import MainCategory from "../../model/mainCategoryModel.js";
import SubCategory from "../../model/subCategoryModel.js";
import { createAppError } from "../../utils/errorHandler.js"; 


const createMainCategoryHelper = async (categoryData) => {
  try {
    const { name, description, image, createdBy } = categoryData;
    
    const existingCategory = await MainCategory.findOne({ name });
    if (existingCategory) {
      throw createAppError("Main Category with this name already exists", 400);
    }

    const mainCategory = new MainCategory({
      name,
      description,
      image,
      createdBy,
    });

    await mainCategory.save();

    return mainCategory;
  } catch (error) {
    if (error.status) {
      throw createAppError(`Error: ${error.message}`, error.status);
    }
    throw createAppError(
      `Error creating main category: ${error.message || "Unknown error"}`,
      500
    );
  }
};

const editMainCategoryHelper = async (categoryId, categoryData, file) => {
  try {
    const { name, description } = categoryData;

    const mainCategory = await MainCategory.findById(categoryId);
    if (!mainCategory) {
      throw createAppError("Main Category not found", 404);
    }

    mainCategory.name = name || mainCategory.name;
    mainCategory.description = description || mainCategory.description;

    if (file) {
      mainCategory.image = file.location;
    }

    await mainCategory.save();

    return mainCategory;
  } catch (error) {
    throw createAppError(`Error editing main category: ${error.message}`, 500);
  }
};

const deleteMainCategoryHelper = async (categoryId) => {
  try {
    const mainCategory = await MainCategory.findById(categoryId);
    if (!mainCategory) {
      throw createAppError("Main Category not found", 404);
    }

    await SubCategory.deleteMany({ mainCategory: categoryId });
    await mainCategory.deleteOne(); 

    return { message: "Main Category deleted successfully" };
  } catch (error) {
    throw createAppError(`Error deleting main category: ${error.message}`, 500);
  }
};



const createSubCategoryHelper = async (subCategoryData) => {
  try {
    const { name, description, mainCategoryId, createdBy } = subCategoryData;
    
    console.log(createdBy)
    const mainCategory = await MainCategory.findById(mainCategoryId);

    if (!mainCategory) {
      throw createAppError("Main Category not found", 404); // 404 not found
    }

    const existingSubCategory = await SubCategory.findOne({
      name,
      mainCategory: mainCategoryId,
    });
    if (existingSubCategory) {
      throw createAppError(
        "Sub Category already exists under this main category",
        400
      ); // 400 bad request
    }

    const subCategory = new SubCategory({
      name,
      description,
      mainCategory: mainCategoryId,
      createdBy 
    });

    await subCategory.save();

    return subCategory; 
  } catch (error) {
    throw createAppError(`Error creating sub category: ${error.message}`, 500); // Internal server error
  }
};


const editSubCategoryHelper = async (subCategoryId, subCategoryData) => {
  try {
    const { name, description, mainCategoryId } = subCategoryData;

    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
      throw createAppError("Sub Category not found", 404); // 404 not found
    }

    subCategory.name = name || subCategory.name;
    subCategory.description = description || subCategory.description;
    subCategory.mainCategory = mainCategoryId || subCategory.mainCategory;

    await subCategory.save();

    return subCategory; // Return the updated subcategory
  } catch (error) {
    throw createAppError(`Error editing sub category: ${error.message}`, 500); // Internal server error
  }
};

// Delete Sub Category
const deleteSubCategoryHelper = async (subCategoryId) => {
  try {
    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
      throw createAppError("Sub Category not found", 404); // 404 not found
    }

    await subCategory.deleteOne();
    return { message: "Sub Category deleted successfully" };
  } catch (error) {
    throw createAppError(`Error deleting sub category: ${error.message}`, 500); // Internal server error
  }
};

// Get all Main Categories with their Sub Categories
const getMainCategoriesHelper = async (adminId) => {
  try {
    const mainCategories = await MainCategory.find({
      $or: [
        { createdBy: adminId },
        { createdBy: null },
      ],
    })
    return mainCategories;
  } catch (error) {
    throw createAppError(
      `Error fetching main categories: ${error.message}`,
      500
    ); // Internal server error
  }
};

export {
  createMainCategoryHelper,
  editMainCategoryHelper,
  deleteMainCategoryHelper,
  createSubCategoryHelper,
  editSubCategoryHelper,
  deleteSubCategoryHelper,
  getMainCategoriesHelper,
};
