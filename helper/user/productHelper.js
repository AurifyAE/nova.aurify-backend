import mongoose from "mongoose";
import Product from "../../model/productSchema.js";
import { createAppError } from "../../utils/errorHandler.js";
import { Cart } from "../../model/cartSchema.js";
import { UserSpotRateModel } from "../../model/UserSpotRateSchema.js";

export const fetchProductHelper = async (adminId, categoryId, userSpotRateId) => {
  try {
    let products = [];

    // Case 1: If userSpotRateId is provided, fetch products from UserSpotRate
    if (userSpotRateId) {
      const userSpotRate = await UserSpotRateModel.findById(userSpotRateId)
        .populate({
          path: "products.productId",
          model: "Product"
        });

      if (!userSpotRate) {
        throw createAppError("User spot rate not found", 404);
      }

      products = userSpotRate.products
        .filter(product => product.productId) // Filter out any null productIds
        .map((product) => ({
          ...product.productId.toObject(),
          pricingType: product.pricingType,
          makingCharge: product.markingCharge, // Note: Using markingCharge from schema
          value: product.value,
          isActive: product.isActive,
        }));

      // If userSpotRate products exist, return them
      if (products.length > 0) {
        return products;
      }
    }

    // Case 2: If categoryId is provided and userSpotRateId is not provided or has no products
    if (categoryId) {
      const category = await mongoose.model("Category").findById(categoryId).populate("products.productId");

      if (!category) {
        throw createAppError("Category not found", 404);
      }

      products = category.products
        .filter(product => product.productId) // Filter out any null productIds
        .map((product) => ({
          ...product.productId.toObject(),
          pricingType: product.pricingType,
          makingCharge: product.makingCharge,
          value: product.value,
          isActive: product.isActive,
        }));

      // If category products exist, return them
      if (products.length > 0) {
        return products;
      }
    }

    // Case 3: If neither userSpotRateId nor categoryId returned products, fetch by adminId
    if (adminId) {
      products = await mongoose.model("Product").aggregate([
        {
          $match: {
            $or: [
              { addedBy: new mongoose.Types.ObjectId(adminId) },
              { addedBy: null },
            ],
          },
        },
        {
          $project: {
            title: 1,
            description: 1,
            images: 1,
            price: 1,
            weight: 1,
            purity: 1,
            stock: 1,
            sku: 1,
            createdAt: 1,
            updatedAt: 1,
            pricingType: { $literal: null },
            makingCharge: { $literal: 0 },
            value: { $literal: 0 },
            isActive: { $literal: false },
          },
        },
      ]);
    }

    if (products.length === 0) {
      throw createAppError("No products found", 404);
    }

    return products;
  } catch (error) {
    throw createAppError(`Error fetching products: ${error.message}`, 500);
  }
};


export const updateCartItemCollection = async (userId, adminId, productId, userPassedQuantity) => {
  try {
    if (!userId || !adminId || !productId) {
      throw new Error("Missing required fields: userId, adminId, or productId");
    }

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check if the user has a cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return { success: false, message: "Cart does not exist for the user" };
    }

    // Find the item in the cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (existingItemIndex !== -1) {
      let existingQuantity = cart.items[existingItemIndex].quantity;

      if (existingQuantity === 1) {
        // If the existing quantity is 1, update it with user-passed quantity
        cart.items[existingItemIndex].quantity = userPassedQuantity;
      } else {
        // Otherwise, add the user-passed quantity to the existing quantity
        cart.items[existingItemIndex].quantity += userPassedQuantity;
      }

      // Remove item if quantity becomes 0 or less
      if (cart.items[existingItemIndex].quantity <= 0) {
        cart.items.splice(existingItemIndex, 1);
      } else {
        cart.items[existingItemIndex].totalPrice =
          cart.items[existingItemIndex].quantity * product.price;
      }
    } else {
      // If the product is not in the cart, add it with the user-passed quantity
      if (userPassedQuantity > 0) {
        cart.items.push({
          productId,
          quantity: userPassedQuantity,
          totalPrice: userPassedQuantity * product.price,
        });
      } else {
        return { success: false, message: "Cannot decrement a non-existing item in the cart" };
      }
    }

    // Update total cart price
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.quantity * product.price;
    }, 0);

    cart.updatedAt = Date.now();

    // Save the updated cart
    await cart.save();

    return { success: true, data: cart };
  } catch (error) {
    return { success: false, message: "Error updating cart: " + error.message };
  }
};



export const fixedProductFixHelper = async (bookingData) => {
  try {
    if (!Array.isArray(bookingData) || bookingData.length === 0) {
      throw new Error("Invalid or empty booking data.");
    }

    const updatePromises = bookingData.map((item) => {
      const { productId, fixedPrice } = item;
      if (fixedPrice <= 0) {
        throw new Error(`Invalid fixed price for productId: ${productId}`);
      }
      return Product.findByIdAndUpdate(
        productId,
        { price: fixedPrice },
        { new: true }
      );
    });

    const updatedProducts = await Promise.all(updatePromises);
    return updatedProducts;
  } catch (error) {
    throw createAppError(`Error fixing product prices: ${error.message}`, 500);
  }
};

export const updateCartItemQuantity = async (
  userId,
  adminId,
  productId,
  quantityChange
) => {
  try {
    if (!userId || !adminId || !productId) {
      throw new Error("Missing required fields");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const productWeight = Number(product.weight);
    if (isNaN(productWeight) || productWeight <= 0) {
      throw new Error("Invalid product weight");
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], totalWeight: 0 });
    }

    cart.items = cart.items || [];
    let existingItem = cart.items.find(
      (item) => item.productId.toString() === productId.toString()
    );

    if (existingItem) {
   
      cart.totalWeight -= existingItem.quantity * productWeight;
      existingItem.quantity += quantityChange;

      if (existingItem.quantity <= 0) {
        cart.items = cart.items.filter(
          (item) => item.productId.toString() !== productId.toString()
        );
      }
    } else {
      if (quantityChange > 0) {
        cart.items.push({
          productId,
          quantity: quantityChange,
        });
      } else {
        throw new Error("Cannot decrement non-existing product in cart");
      }
    }

    const productIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });


    const productWeights = {};
    products.forEach((prod) => {
      productWeights[prod._id.toString()] = prod.weight;
    });

    
    cart.totalWeight = cart.items.reduce((total, item) => {
      const itemWeight = productWeights[item.productId.toString()] || 0;
      return total + item.quantity * itemWeight;
    }, 0);

    const totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);

    
    if (isNaN(cart.totalWeight)) cart.totalWeight = 0;
    if (isNaN(totalQuantity)) totalQuantity = 0;

    cart.updatedAt = Date.now();
    await cart.save();

    return { 
      success: true, 
      message: "Cart updated successfully", 
      data: cart,
      totalQuantity: totalQuantity, 
    };
  } catch (error) {
    return { success: false, message: "Error updating cart: " + error.message };
  }
};


export const deleteCartProduct = async (userId, productId, adminId) => {
  try {
    if (!userId || !productId || !adminId) {
      throw new Error("Missing required fields");
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error("Cart not found");
    }

    const product = await Product.findOne({ _id: productId, addedBy: adminId });
    if (!product) {
      throw new Error("Product not found or not managed by this admin");
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );
    if (existingItemIndex === -1) {
      throw new Error("Product not found in cart");
    }
    cart.items.splice(existingItemIndex, 1);

    const productIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    cart.totalWeight = cart.items.reduce((total, item) => {
      const prod = products.find(
        (p) => p._id.toString() === item.productId.toString()
      );
      return prod ? total + item.quantity * prod.weight : total;
    }, 0);

    if (isNaN(cart.totalWeight)) cart.totalWeight = 0;

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      return { success: true, message: "Cart deleted successfully" };
    }
    cart.updatedAt = Date.now();
    await cart.save();

    return { success: true, message: "Item removed successfully", data: cart };
  } catch (error) {
    return { success: false, message: "Error deleting item: " + error.message };
  }
};

export const getUserCartItems = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error("Cart not found");
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    const cartInfo = await Cart.aggregate([
      { $match: { userId: objectId } },
      { $unwind: "$items" }, // Unwind the items array
      {
        $lookup: {
          from: "products", // Collection name for the `Product` model
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" }, // Unwind product details
      {
        $group: {
          _id: "$_id", // Cart ID
          userId: { $first: "$userId" },
          totalWeight: { 
            $sum: { $multiply: ["$items.quantity", "$productDetails.weight"] } 
          }, // ✅ Calculate total weight
          items: {
            $push: {
              productId: "$items.productId",
              quantity: "$items.quantity",
              productDetails: {
                title: "$productDetails.title",
                description: "$productDetails.description",
                images: "$productDetails.images",
                price: "$productDetails.price",
                purity: "$productDetails.purity",
                sku: "$productDetails.sku",
                stock: "$productDetails.stock",
                type: "$productDetails.type",
                weight: "$productDetails.weight",
              },
            },
          },
          updatedAt: { $first: "$updatedAt" },
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          items: 1,
          totalWeight: 1, // ✅ Include total weight
          updatedAt: 1,
        },
      },
    ]);

    return { success: true, data: cartInfo.length > 0 ? cartInfo[0] : null };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching cart items: " + error.message,
    };
  }
};