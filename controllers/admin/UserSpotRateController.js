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

    // Using aggregation pipeline for optimized fetching, filtered by userId
    const spotRates = await UserSpotRateModel.aggregate([
      {
        // Filter by userId (createdBy)
        $match: {
          createdBy: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $addFields: {
          "productIds": {
            $map: {
              input: "$products",
              as: "product",
              in: "$$product.productId"
            }
          }
        }
      },
      {
        $lookup: {
          from: "products", // Collection name for Product model
          localField: "productIds",
          foreignField: "_id",
          as: "productData"
        }
      },
      {
        $project: {
          _id: 1,
          createdBy: 1,
          isActive: 1,
          products: {
            $map: {
              input: "$products",
              as: "productDetail",
              in: {
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
                      _id: "$$foundProduct._id",
                      title: "$$foundProduct.title",
                      description: "$$foundProduct.description",
                      images: "$$foundProduct.images",
                      price: "$$foundProduct.price",
                      weight: "$$foundProduct.weight",
                      purity: "$$foundProduct.purity",
                      stock: "$$foundProduct.stock",
                      sku: "$$foundProduct.sku"
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        // Remove temporary fields
        $project: {
          productIds: 0,
          productData: 0
        }
      }
    ]);

    // Transform data to a frontend-friendly format
    const formattedResponse = spotRates.map(spotRate => ({
      _id: spotRate._id,
      createdBy: spotRate.createdBy,
      isActive: spotRate.isActive,
      products: spotRate.products.map(item => ({
        // Pricing details
        markingCharge: item.markingCharge,
        pricingType: item.pricingType,
        value: item.value,
        isActive: item.isActive,
        
        // Product details
        productId: item.product?._id || null,
        title: item.product?.title || null,
        description: item.product?.description || null,
        images: item.product?.images || [],
        price: item.product?.price || 0,
        weight: item.product?.weight || 0,
        purity: item.product?.purity || 0,
        stock: item.product?.stock || false,
        sku: item.product?.sku || null
      }))
    }));

    res.status(200).json({
      success: true,
      count: formattedResponse.length,
      userSpotRates: formattedResponse
    });
  } catch (error) {
    next(error);
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
