import mongoose from "mongoose";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";
import { addProductDetailHelper } from "../../helper/admin/productHelper.js";
import { createAppError } from "../../utils/errorHandler.js";

export const getUserCommodity = async (req, res, next) => {
  try {
    const { adminId, categoryId } = req.params;
    const userSpotRate = await UserSpotRateModel.findOne({
      createdBy: adminId,
    });

    if (!userSpotRate) {
      return res.status(204).json({ message: "User spot rate not found" });
    }

    const category = userSpotRate.categories.find(
      (cat) => cat.categoryId === categoryId
    );

    if (!category) {
      return res.status(204).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error fetching spot rates:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUserSpread = async (req, res) => {
  try {
    const {metal, type, value } = req.body;
    const {  adminId, categoryId } = req.params;
    let userSpotRate = await UserSpotRateModel.findOne({ createdBy: adminId });

    if (!userSpotRate) {
      // Create a new UserSpotRate if it doesn't exist
      userSpotRate = new UserSpotRateModel({
        createdBy: adminId,
        categories: [{ categoryId }],
      });
    }

    let category = userSpotRate.categories.find(
      (cat) => cat.categoryId === categoryId
    );

    if (!category) {
      // Add a new category if it doesn't exist
      category = { categoryId };
      userSpotRate.categories.push(category);
    }

    const field = `${metal.toLowerCase()}${
      type.charAt(0).toUpperCase() + type.slice(1)
    }${type === "low" || type === "high" ? "Margin" : "Spread"}`;
    category[field] = value;

    await userSpotRate.save();

    res.json({ message: "Spread updated successfully", data: category });
  } catch (error) {
    console.error("Error updating spread:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const addProduct = async (req, res, next) => {
  try {
    let { userSpotRateId = null, userId } = req.params;
    
    if (userSpotRateId === "null") {
      userSpotRateId = null;
    }
    
    const productDetail = req.body;

    if (!userId) {
      return next(createAppError("User ID is required", 400));
    }

    if (!productDetail.productId) {
      return next(createAppError("Product ID is required", 400));
    }

    const updatedUserSpotRate = await addProductDetailHelper(
      userSpotRateId,
      productDetail,
      userId
    );

    res.status(201).json({
      success: true,
      message: userSpotRateId && userSpotRateId !== "null" 
        ? "Product detail added successfully" 
        : "New spot rate created with product",
      userSpotRate: updatedUserSpotRate,
    });
  } catch (error) {
    next(error);
  }
};
