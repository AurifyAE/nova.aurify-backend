import mongoose from "mongoose";
import { Cart } from "../../model/cartSchema.js";
import shopModel from "../../model/shopSchema.js";
import { Wishlist } from "../../model/wishlistSchema.js";
export const fetchProductDetails = async (adminId) => {
  try {
    const productData = await shopModel.findOne({ createdBy: adminId });
    if (!productData) {
      return { success: false, productData: null };
    }
    return { success: true, productData };
  } catch (error) {
    throw new Error("Error fetching ProductDetails: " + error.message);
  }
};

export const updateCartCollection = async (
  userId,
  adminId,
  productId,
  quantityChange
) => {
  try {
    if (!userId || !adminId || !productId) {
      throw new Error("Missing required fields");
    }

    const shop = await shopModel.findOne({
      createdBy: adminId,
      "shops._id": productId,
    });
    if (!shop) {
      throw new Error("Shop or product not found");
    }

    const product = shop.shops.id(productId);
    if (!product) {
      throw new Error("Product not found in the shop");
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0 });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity += quantityChange;

      if (cart.items[existingItemIndex].quantity <= 0) {
        cart.items.splice(existingItemIndex, 1);
      } else {
        cart.items[existingItemIndex].totalPrice =
          cart.items[existingItemIndex].quantity * product.rate;
      }
    } else {
      if (quantityChange > 0) {
        cart.items.push({
          productId,
          quantity: quantityChange,
          totalPrice: quantityChange * product.rate,
        });
      } else {
        throw new Error("Cannot decrement non-existing product in cart");
      }
    }

    cart.totalPrice = cart.items.reduce((total, item) => {
      const cartProduct = shop.shops.id(item.productId);
      return cartProduct ? total + item.quantity * cartProduct.rate : total;
    }, 0);
    cart.updatedAt = Date.now();

    await cart.save();
    return { success: true, data: cart };
  } catch (error) {
    return { success: false, message: "Error updating cart: " + error.message };
  }
};

export const deleteCart = async (userId, productId, adminId) => {
  try {
    if (!userId || !productId || !adminId) {
      throw new Error("Missing required fields");
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error("Cart not found");
    }
    const shop = await shopModel.findOne({
      createdBy: adminId,
      "shops._id": productId,
    });
    if (!shop) {
      throw new Error("Shop or product not found");
    }
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );
    if (existingItemIndex === -1) {
      throw new Error("Product not found in cart");
    }
    cart.items.splice(existingItemIndex, 1);
    cart.totalPrice = cart.items.reduce((total, item) => {
      const cartProduct = shop.shops.id(item.productId);
      return cartProduct ? total + item.quantity * cartProduct.rate : total;
    }, 0);
    cart.updatedAt = Date.now();
    await cart.save();
    return { success: true, data: cart };
  } catch (error) {
    return {
      success: false,
      message: "Error deleting cart item: " + error.message,
    };
  }
};


export const getUserCarts = async (userId) => {
  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error("Cart not found");
    }
    const objectId = new mongoose.Types.ObjectId(userId);
    const cartInfo = await Cart.aggregate([
      { $match: { userId: objectId } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "shops",
          let: { productId: "$items.productId" },
          pipeline: [
            { $unwind: "$shops" },
            { 
              $match: { 
                $expr: { $eq: ["$shops._id", "$$productId"] }
              }
            }
          ],
          as: "items.productDetails"
        }
      },
      { $unwind: "$items.productDetails" },
      {
        $group: {
          _id: "$_id",
          userId: { $first: "$userId" },
          items: {
            $push: {
              productId: "$items.productId",
              quantity: "$items.quantity",
              productDetails: "$items.productDetails.shops",
              itemTotal: { $multiply: ["$items.quantity", "$items.productDetails.shops.rate"] }
            }
          },
          totalPrice: { $sum: { $multiply: ["$items.quantity", "$items.productDetails.shops.rate"] } },
          updatedAt: { $first: "$updatedAt" }
        }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          items: 1,
          totalPrice: 1,
          updatedAt: 1
        }
      }
    ]);
    return { success: true, data: cartInfo };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching cart item: " + error.message,
    };
  }
};


export const updateWishlistCollection = async (userId, adminId, productId, action) => {
  try {
    if (!userId || !adminId || !productId || !action) {
      throw new Error("Missing required fields");
    }

    // Find the shop and product
    const shop = await shopModel.findOne({
      createdBy: adminId,
      "shops._id": productId,
    });

    if (!shop) {
      throw new Error("Shop or product not found");
    }

    const product = shop.shops.id(productId);
    if (!product) {
      throw new Error("Product not found in the shop");
    }

    // Find or create the user's wishlist
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
    }

    // Add or remove the product based on the action
    const existingItemIndex = wishlist.items.findIndex(item => item.productId.toString() === productId);

    if (action === 'add') {
      if (existingItemIndex === -1) {
        wishlist.items.push({ productId });
      } else {
        return { success: false, message: "Product already in wishlist" };
      }
    } else if (action === 'remove') {
      if (existingItemIndex !== -1) {
        wishlist.items.splice(existingItemIndex, 1);
      } else {
        return { success: false, message: "Product not found in wishlist" };
      }
    } else {
      throw new Error("Invalid action specified");
    }

    wishlist.updatedAt = Date.now();
    await wishlist.save();

    return { success: true, data: wishlist };
  } catch (error) {
    return { success: false, message: "Error updating wishlist: " + error.message };
  }
};


export const getUserWishlists = async (userId) => {
  try {
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw new Error("Wishlist not found");
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    const wishlistDetails = await Wishlist.aggregate([
      { $match: { userId: objectId } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "shops",
          let: { productId: "$items.productId" },
          pipeline: [
            { $unwind: "$shops" },
            {
              $match: {
                $expr: { $eq: ["$shops._id", "$$productId"] }
              }
            },
            {
              $project: {
                _id: 0,
                name: "$shops.name",
                rate: "$shops.rate",
                type: "$shops.type",
                weight: "$shops.weight",
                image: "$shops.image",
              }
            }
          ],
          as: "items.productDetails"
        }
      },
      { $unwind: "$items.productDetails" },
      {
        $group: {
          _id: "$_id",
          userId: { $first: "$userId" },
          items: {
            $push: {
              productId: "$items.productId",
              productDetails: "$items.productDetails",
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          items: 1,
        }
      }
    ]);

    return { success: true, data: wishlistDetails };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching wishlist details: " + error.message,
    };
  }
};