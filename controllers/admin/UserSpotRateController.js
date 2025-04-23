import mongoose from "mongoose";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";
import { addProductDetailHelper, removeProductById, updateProductByProductId } from "../../helper/admin/productHelper.js";
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
export const getAllUserSpotRates = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    // Using aggregation pipeline for optimized fetching
    const spotRates = await UserSpotRateModel.aggregate([
      // Match documents by userId
      { $match: { createdBy: objectId } },
      
      // Create an array of product IDs for lookup
      { $addFields: {
          "productIds": {
            $map: {
              input: "$products",
              as: "product",
              in: "$$product.productId"
            }
          }
        }
      },
      
      // Lookup product details
      { $lookup: {
          from: "products",
          localField: "productIds",
          foreignField: "_id",
          as: "productData"
        }
      },
      
      // Structure the response data to include all fields
      { $project: {
          _id: 1,
          createdBy: 1,
          isActive: 1,
          products: {
            $map: {
              input: "$products",
              as: "productDetail",
              in: {
                _id: "$$productDetail._id",
                productId: "$$productDetail.productId",
                markingCharge: "$$productDetail.markingCharge",
                pricingType: "$$productDetail.pricingType",
                value: "$$productDetail.value",
                isActive: "$$productDetail.isActive",
                
                product: {
                  $let: {
                    vars: {
                      foundProduct: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$productData",
                              as: "pd",
                              cond: { $eq: ["$$pd._id", "$$productDetail.productId"] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: {
                      $cond: {
                        if: { $ne: ["$$foundProduct", null] },
                        then: {
                          _id: "$$foundProduct._id",
                          title: "$$foundProduct.title",
                          description: "$$foundProduct.description",
                          images: "$$foundProduct.images",
                          price: "$$foundProduct.price",
                          weight: "$$foundProduct.weight",
                          purity: "$$foundProduct.purity",
                          stock: "$$foundProduct.stock",
                          sku: "$$foundProduct.sku",
                          // Include any other product fields you need
                          category: "$$foundProduct.category",
                          subCategory: "$$foundProduct.subCategory",
                          createdAt: "$$foundProduct.createdAt",
                          updatedAt: "$$foundProduct.updatedAt"
                        },
                        else: null
                      }
                    }
                  }
                }
              }
            }
          },
          createdAt: 1,
          updatedAt: 1
        }
      },
      
      // Remove temporary fields
      { $project: {
          productIds: 0,
          productData: 0
        }
      }
    ]);

    // Handle case where no spot rates are found
    if (!spotRates || spotRates.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        userSpotRates: []
      });
    }

    // Return full data structure without additional transformation
    return res.status(200).json({
      success: true,
      count: spotRates.length,
      userSpotRates: spotRates
    });
    
  } catch (error) {
    console.error("Error fetching user spot rates:", error);
    return next(new Error(`Failed to fetch user spot rates: ${error.message}`));
  }
};

export const updateUserSpotRateProduct = async (req, res, next) => {
  try {
    const { userSpotRateId, Id } = req.params;
    const productData = req.body;
    
    const updatedUserSpotRate = await updateProductByProductId(userSpotRateId, Id, productData);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Product successfully updated',
      data: updatedUserSpotRate 
    });
  } catch (error) {
    console.error('Error updating product in user spot rate:', error);
    return next(error);
  }
};

export const deleteUserSpotRateProduct = async (req, res, next) => {
  try {
    const { userSpotRateId, Id } = req.params;
    
    const updatedUserSpotRate = await removeProductById(userSpotRateId, Id);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Product successfully removed',
      data: updatedUserSpotRate 
    });
  } catch (error) {
    console.error('Error deleting product from user spot rate:', error);
    return next(error);
  }
};
