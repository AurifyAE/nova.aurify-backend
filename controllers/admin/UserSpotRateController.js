import mongoose from "mongoose";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";
import { addProductDetailHelper } from "../../helper/admin/productHelper.js";

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
    const { userSpotRateId } = req.params;
    const productDetail = req.body;

    if (!productDetail.productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
    }

    const updatedUserSpotRate = await addProductDetailHelper(
      userSpotRateId,
      productDetail
    );

    if (!updatedUserSpotRate) {
      return res
        .status(404)
        .json({ success: false, message: "userSpotRate not found" });
    }

    res.status(201).json({
      success: true,
      message: "Product detail added successfully",
      userSpotRate: updatedUserSpotRate,
    });
  } catch (error) {
    next(error);
  }
};
