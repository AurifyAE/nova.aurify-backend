import {
  createCategory,
  updateCategory,
  deleteCategoryById,
  getAllCategories,
  addProductDetailHelper,
  findCategoryById,
  removeProductFromCategory,
  updateProductInCategories
} from "../../helper/admin/categoryHelper.js";

export const addCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const { adminId } = req.params;

    const savedCategory = await createCategory(name, adminId);

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      category: savedCategory,
    });
  } catch (error) {
    next(error);
  }
};
export const addProductDetail = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const productDetail = req.body;

    if (!productDetail.productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
    }

    const updatedCategory = await addProductDetailHelper(
      categoryId,
      productDetail
    );

    if (!updatedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(201).json({
      success: true,
      message: "Product detail added successfully",
      category: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
};

export const editCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { adminId } = req.params;

    const updatedCategory = await updateCategory(id, adminId, name);

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found or unauthorized",
      });
    }

    res.json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id, adminId } = req.params;

    const deletedCategory = await deleteCategoryById(id, adminId);

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found or unauthorized",
      });
    }

    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    const categories = await getAllCategories(adminId);

    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

export const getSingleCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const category = await findCategoryById(categoryId);

    res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductInCategory = async (req, res, next) => {
  try {
    const { categoryId, productDetailId } = req.params;
    const updateData = req.body;

    // Validate update data
    const allowedFields = ["markingCharge", "pricingType", "value", "isActive"];
    const invalidFields = Object.keys(updateData).filter(
      (key) => !allowedFields.includes(key)
    );

    if (invalidFields.length > 0) {
      return next(
        createAppError(`Invalid fields: ${invalidFields.join(", ")}`, 400)
      );
    }

    const updatedCategory = await updateProductInCategories(
      categoryId,
      productDetailId,
      updateData
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProductFromCategory = async (req, res, next) => {
  try {
    const { categoryId, productDetailId } = req.params;

    const updatedCategory = await removeProductFromCategory(
      categoryId,
      productDetailId
    );

    res.status(200).json({
      success: true,
      message: "Product removed from category successfully",
      data: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
};
