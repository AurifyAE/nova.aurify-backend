import mongoose from "mongoose";
import Product from "../../model/productSchema.js";
import { createAppError } from "../../utils/errorHandler.js";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";
import { UsersModel } from "../../model/usersSchema.js";

export const createProductHelper = async (productData) => {
  try {
    const {
      title,
      description,
      images,
      price,
      addedBy,
      addedByUser,
      weight,
      purity,
      sku,
      type,
    } = productData;

    // Validate SKU uniqueness
    const skuExists = await Product.findOne({ sku });
    if (skuExists) {
      throw createAppError("SKU already exists", 400);
    }

    const product = new Product({
      title,
      description,
      images: images || [], // Default empty array if no images are uploaded
      price,
      addedBy: addedBy || null,
      addedByUser: addedByUser || null,
      weight,
      purity,
      stock: true, // Default stock status
      sku,
      type: type || "GOLD", // Default tag if not provided
    });

    await product.save();
    return product; // Return the created product
  } catch (error) {
    // Propagate structured errors
    if (error.isOperational) throw error;

    // For unexpected errors, wrap them in a generic error response
    throw createAppError(`Error creating product: ${error.message}`, 500);
  }
};

export const updateProductHelper = async (productId, updateData) => {
  try {
    // Check if SKU is unique
    if (updateData.sku) {
      const skuExists = await Product.findOne({
        sku: updateData.sku,
        _id: { $ne: productId },
      });

      if (skuExists) {
        throw createAppError("SKU already exists", 400);
      }
    }

    // Update the product
    const result = await Product.updateOne(
      { _id: productId },
      { $set: updateData },
      { runValidators: true }
    );

    if (result.modifiedCount === 0) {
      throw createAppError("Product not found or no changes made", 404);
    }

    // Return the updated product
    return await Product.findById(productId);
  } catch (error) {
    if (error.isOperational) throw error;

    throw createAppError(`Error updating product: ${error.message}`, 500);
  }
};

export const deleteProductHelper = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw createAppError("Product not found", 404);
    }
    product.stock = !product.stock;
    await product.save();
    return { message: "Product marked as deleted successfully" };
  } catch (error) {
    if (error.isOperational) throw error;

    throw createAppError(`Error deleting product: ${error.message}`, 500);
  }
};

export const fetchAllProductHelper = async (adminId) => {
  try {
    // Fetch all products from the database
    const products = await Product.find({ addedBy: adminId });

    if (!products || products.length === 0) {
      throw createAppError("No products found", 404);
    }

    return products; // Return all products
  } catch (error) {
    if (error.isOperational) throw error;

    throw createAppError(`Error fetching products: ${error.message}`, 500);
  }
};

export const addProductDetailHelper = async (userSpotRateId, productDetail, userId) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let updatedUserSpotRate;
      
      // Case 1: If userSpotRateId is valid, user is trying to update an existing rate
      if (userSpotRateId && userSpotRateId !== "null" && userSpotRateId !== "new") {
        // First verify that this spot rate belongs to the user
        const existingRate = await UserSpotRateModel.findOne({
          _id: userSpotRateId,
          createdBy: userId
        });
        
        if (!existingRate) {
          throw createAppError("UserSpotRate not found or does not belong to this user", 404);
        }
        
        // Check if product with same ID already exists
        const productExists = existingRate.products.some(
          product => product.productId.toString() === productDetail.productId.toString()
        );
        
        if (productExists) {
          throw createAppError("Product already exists in this spot rate", 400);
        }
        
        // Update the existing spot rate
        updatedUserSpotRate = await UserSpotRateModel.findByIdAndUpdate(
          userSpotRateId,
          { $push: { products: productDetail } },
          { new: true, session }
        );
      } 
      // Case 2: Check if user already has a spot rate
      else {
        // Check if user already has a spot rate
        const existingUserRate = await UserSpotRateModel.findOne({ createdBy: userId });
        
        if (existingUserRate) {
          // Check if product with same ID already exists
          const productExists = existingUserRate.products.some(
            product => product.productId.toString() === productDetail.productId.toString()
          );
          
          if (productExists) {
            throw createAppError("Product already exists in this spot rate", 400);
          }
          
          // User already has a spot rate, just add the product to it
          updatedUserSpotRate = await UserSpotRateModel.findByIdAndUpdate(
            existingUserRate._id,
            { $push: { products: productDetail } },
            { new: true, session }
          );
        } else {
          // User doesn't have a spot rate yet, create a new one
          const newUserSpotRate = new UserSpotRateModel({
            createdBy: userId,
            products: [productDetail],
            isActive: true
          });
          
          updatedUserSpotRate = await newUserSpotRate.save({ session });
        }
      }

      // Update the user's reference to this spot rate ID and nullify categoryId
      const updatedUser = await UsersModel.findOneAndUpdate(
        { "users._id": userId },
        { 
          $set: { 
            "users.$.userSpotRateId": updatedUserSpotRate._id,
            "users.$.categoryId": null
          }
        },
        { new: true, session }
      );

      if (!updatedUser) {
        throw createAppError("User not found", 404);
      }

      await session.commitTransaction();
      session.endSession();

      return updatedUserSpotRate;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

export const updateProductByProductId = async (userSpotRateId, Id, productData) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userSpotRateId)) {
      throw createAppError('Invalid user spot rate ID', 400);
    }
    
    if (!mongoose.Types.ObjectId.isValid(Id)) {
      throw createAppError('Invalid product ID', 400);
    }
    
    // Create update object with dot notation for nested documents
    const updateFields = {};
    for (const [key, value] of Object.entries(productData)) {
      updateFields[`products.$.${key}`] = value;
    }
    
    const result = await UserSpotRateModel.findOneAndUpdate(
      { 
        _id: userSpotRateId, 
        'products._id': Id 
      },
      { $set: updateFields },
      { new: true, runValidators: true }
    )
    if (!result) {
      throw createAppError('User spot rate or product not found', 404);
    }
    
    return result;
  } catch (error) {
    if (error.statusCode) throw error;
    
    if (error.name === 'ValidationError') {
      throw createAppError(
        `Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`, 
        400
      );
    }
    
    throw createAppError(
      error.message || 'Error updating product in user spot rate', 
      error.statusCode || 500
    );
  }
};

export const removeProductById = async (userSpotRateId, productObjectId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userSpotRateId)) {
      throw createAppError('Invalid user spot rate ID', 400);
    }
    
    if (!mongoose.Types.ObjectId.isValid(productObjectId)) {
      throw createAppError('Invalid product ID', 400);
    }
    
    const result = await UserSpotRateModel.findByIdAndUpdate(
      userSpotRateId,
      { $pull: { products: { _id: productObjectId } } },
      { new: true }
    )
   
    
    if (!result) {
      throw createAppError('User spot rate not found', 404);
    }
    
    return result;
  } catch (error) {
    if (error.statusCode) throw error;
    throw createAppError(
      error.message || 'Error removing product from user spot rate', 
      error.statusCode || 500
    );
  }
};