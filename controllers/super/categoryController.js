import {
  createMainCategoryHelper,
  editMainCategoryHelper,
  deleteMainCategoryHelper,
  createSubCategoryHelper,
  editSubCategoryHelper,
  deleteSubCategoryHelper,
  getMainCategoriesHelper,
  getSubCategoriesHelper
} from "../../helper/superAdmin/categoryHelper.js";

// Add Main Category
export const createMainCategory = async (req, res, next) => {
  try {
    const categoryData = req.body;
    // Image URL will be available from the file uploaded through 'uploadSingle'
    if (req.file) {
      categoryData.image = req.file.location; // This assumes you're using S3 or a similar service that returns a location URL
    }

    const mainCategory = await createMainCategoryHelper(categoryData);
    res.status(201).json({ success: true, data: mainCategory });
  } catch (error) {
    next(error);
  }
};

// Edit Main Category
export const editMainCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const categoryData = req.body;
    const file = req.file;
    const mainCategory = await editMainCategoryHelper(
      categoryId,
      categoryData,
      file
    );
    res.status(200).json({ success: true, data: mainCategory });
  } catch (error) {
    next(error);
  }
};

// Delete Main Category
export const deleteMainCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const result = await deleteMainCategoryHelper(categoryId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Add Sub Category
export const createSubCategory = async (req, res, next) => {
  try {
    const subCategoryData = req.body;
    const subCategory = await createSubCategoryHelper(subCategoryData);
    res.status(201).json({ success: true, data: subCategory });
  } catch (error) {
    next(error);
  }
};

// Edit Sub Category
export const editSubCategory = async (req, res, next) => {
  try {
    const { subCategoryId } = req.params;
    const subCategoryData = req.body;
    const subCategory = await editSubCategoryHelper(
      subCategoryId,
      subCategoryData
    );
    res.status(200).json({ success: true, data: subCategory });
  } catch (error) {
    next(error);
  }
};

// Delete Sub Category
export const deleteSubCategory = async (req, res, next) => {
  try {
    const { subCategoryId } = req.params;
    const result = await deleteSubCategoryHelper(subCategoryId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Get all Main Categories with Sub Categories
export const getMainCategories = async (req, res, next) => {
  try {
    const categories = await getMainCategoriesHelper();
    const filteredCategories = categories.map((category) => ({
      _id: category._id,
      name: category.name,
      description: category.description,
      image: category.image,
    }));
    res.status(200).json({ success: true, data: filteredCategories });
  } catch (error) {
    next(error);
  }
};


// get subcategory
export const getSubCategories = async (req, res, next) => {
  try {
    const subCategories = await getSubCategoriesHelper();

    // Respond with the retrieved subcategories
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    next(error); // Forward errors to the error-handling middleware
  }
};