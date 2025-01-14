import MainCategory from "../../model/mainCategoryModel.js";
import SubCategory from "../../model/subCategoryModel.js";
import { createAppError } from "../../utils/errorHandler.js"; // Make sure to use the utility function

// Create Main Category
const createMainCategoryHelper = async (categoryData) => {
  try {
    const { name, description, image } = categoryData;

    // Check if a category with the same name already exists
    const existingCategory = await MainCategory.findOne({ name });
    if (existingCategory) {
      throw createAppError("Main Category already exists", 400); // Send error with a 400 status code
    }

    // Create the new category with image
    const mainCategory = new MainCategory({
      name,
      description,
      image,  // Include the image URL in the saved document
    });

    await mainCategory.save();  // Save the category to the database
    return mainCategory;  // Return the created category
  } catch (error) {
    throw createAppError(`Error creating main category: ${error.message}`, 500); // General server error
  }
};

// Edit Main Category
const editMainCategoryHelper = async (categoryId, categoryData, file) => {
  try {
    const { name, description } = categoryData;

    // Find the existing category by ID
    const mainCategory = await MainCategory.findById(categoryId);
    if (!mainCategory) {
      throw createAppError("Main Category not found", 404); // 404 not found
    }

    // Update fields only if the new value is provided
    mainCategory.name = name || mainCategory.name;
    mainCategory.description = description || mainCategory.description;

    // If a new image is provided, update the image URL
    if (file) {
      mainCategory.image = file.location;  // Assuming 'file.location' is the URL of the uploaded image
    }

    // Save the updated category
    await mainCategory.save();

    return mainCategory; // Return the updated category
  } catch (error) {
    throw createAppError(`Error editing main category: ${error.message}`, 500); // Internal server error
  }
};

// Delete Main Category
const deleteMainCategoryHelper = async (categoryId) => {
  try {
    const mainCategory = await MainCategory.findById(categoryId);
    if (!mainCategory) {
      throw createAppError("Main Category not found", 404); // 404 not found
    }

    await SubCategory.deleteMany({ mainCategory: categoryId }); // Delete subcategories associated with this category
    await mainCategory.deleteOne(); 

    return { message: "Main Category deleted successfully" };
  } catch (error) {
    throw createAppError(`Error deleting main category: ${error.message}`, 500); // Internal server error
  }
};

// Create Sub Category
const createSubCategoryHelper = async (subCategoryData) => {
  try {
    const { name, description, mainCategoryId } = subCategoryData;

    const mainCategory = await MainCategory.findById(mainCategoryId);
  
    if (!mainCategory) {
      throw createAppError("Main Category not found", 404); // 404 not found
    }

    const existingSubCategory = await SubCategory.findOne({
      name,
      mainCategory: mainCategoryId,
    });
    if (existingSubCategory) {
      throw createAppError("Sub Category already exists under this main category", 400); // 400 bad request
    }

    const subCategory = new SubCategory({
      name,
      description,
      mainCategory: mainCategoryId,
    });

    await subCategory.save();

    return subCategory; // Return the created subcategory
  } catch (error) {
    throw createAppError(`Error creating sub category: ${error.message}`, 500); // Internal server error
  }
};

// Edit Sub Category
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
; 

    return { message: "Sub Category deleted successfully" };
  } catch (error) {
    throw createAppError(`Error deleting sub category: ${error.message}`, 500); // Internal server error
  }
};

// Get all Main Categories with their Sub Categories
const getMainCategoriesHelper = async () => {
  try {
    const mainCategories = await MainCategory.find({createdBy:null})
    return mainCategories;
  } catch (error) {
    throw createAppError(`Error fetching main categories: ${error.message}`, 500); // Internal server error
  }
};

// get subcategory
const getSubCategoriesHelper = async () => {
  try {
    // Fetch subcategories and populate their mainCategory field
    const subCategories = await SubCategory.find().populate("mainCategory", "name");

    // Optionally format the result
    return subCategories.map((subCategory) => ({
      _id: subCategory._id,
      name: subCategory.name,
      description: subCategory.description,
      mainCategory: subCategory.mainCategory ? subCategory.mainCategory.name : null,
      image: subCategory.image,
    }));
  } catch (error) {
    throw new Error(`Error fetching subcategories: ${error.message}`);
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
  getSubCategoriesHelper
 
};
