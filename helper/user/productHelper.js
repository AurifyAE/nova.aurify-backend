import mongoose from "mongoose";
import { Cart } from "../../model/cartSchema.js";
import Product from "../../model/productSchema.js";
import { Wishlist } from "../../model/wishlistSchema.js";
import MainCategory from "../../model/mainCategoryModel.js";
import SubCategory from "../../model/subCategoryModel.js";

export const fetchProductDetails = async (mainCategoryId) => {
  try {
    if (!mainCategoryId) {
      throw new Error("Main category ID is required");
    }

    const subCategories = await SubCategory.find(
      { mainCategory: mainCategoryId },
      "_id"
    );

    if (!subCategories || subCategories.length === 0) {
      throw new Error("No subcategories found for the given main category");
    }

    const subCategoryIds = subCategories.map((sub) => sub._id);

    const result = await mongoose.model("Product").aggregate([
      {
        $match: {
          subCategory: { $in: subCategoryIds },
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subCategory",
          foreignField: "_id",
          as: "subCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$subCategoryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "maincategories",
          localField: "subCategoryDetails.mainCategory",
          foreignField: "_id",
          as: "mainCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$mainCategoryDetails",
          preserveNullAndEmptyArrays: true,
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
          tags: 1,
          sku: 1,
          subCategoryDetails: {
            _id: "$subCategoryDetails._id",
            name: "$subCategoryDetails.name",
          },
          mainCategoryDetails: {
            _id: "$mainCategoryDetails._id",
            name: "$mainCategoryDetails.name",
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching product details: " + error.message,
    };
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

    const shop = await Product.findOne({
      _id: productId,
      addedBy: adminId,
    });

    if (!shop) {
      throw new Error("Shop or product not found");
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
          cart.items[existingItemIndex].quantity * shop.price;
      }
    } else {
      if (quantityChange > 0) {
        cart.items.push({
          productId,
          quantity: quantityChange,
          totalPrice: quantityChange * shop.price,
        });
      } else {
        throw new Error("Cannot decrement non-existing product in cart");
      }
    }

    const productIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    cart.totalPrice = cart.items.reduce((total, item) => {
      const product = products.find(
        (product) => product._id.toString() === item.productId.toString()
      );
      return product ? total + item.quantity * product.price : total;
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
    const shop = await Product.findOne({
      _id: productId,
      addedBy: adminId,
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

    const productIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    cart.totalPrice = cart.items.reduce((total, item) => {
      const product = products.find(
        (product) => product._id.toString() === item.productId.toString()
      );
      return product ? total + item.quantity * product.price : total;
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

export const deleteWishlistItem = async (userId, productId, adminId) => {
  try {
    if (!userId || !productId || !adminId) {
      throw new Error("Missing required fields");
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw new Error("Wishlist not found");
    }
    const shop = await Product.findOne({
      _id: productId,
      addedBy: adminId,
    });

    if (!shop) {
      throw new Error("Shop or product not found");
    }

    // Remove the product from the user's wishlist
    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true }
    );

    if (!updatedWishlist) {
      throw new Error("Wishlist not found or product was not in wishlist");
    }

    return { success: true, data: updatedWishlist };
  } catch (error) {
    return {
      success: false,
      message: "Error deleting wishlist item: " + error.message,
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
        $lookup: {
          from: "subcategories", // Collection name for SubCategory model
          localField: "productDetails.subCategory",
          foreignField: "_id",
          as: "productDetails.subCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$productDetails.subCategoryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "maincategories", // Collection name for MainCategory model
          localField: "productDetails.subCategoryDetails.mainCategory",
          foreignField: "_id",
          as: "productDetails.mainCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$productDetails.mainCategoryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id", // Cart ID
          userId: { $first: "$userId" },
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
                weight: "$productDetails.weight",
                subCategory: "$productDetails.subCategoryDetails.name",
                mainCategory: "$productDetails.mainCategoryDetails.name",
              },
              itemTotal: {
                $multiply: ["$items.quantity", "$productDetails.price"],
              },
            },
          },
          totalPrice: {
            $sum: { $multiply: ["$items.quantity", "$productDetails.price"] },
          },
          updatedAt: { $first: "$updatedAt" },
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          items: 1,
          totalPrice: 1,
          updatedAt: 1,
        },
      },
    ]);

    return { success: true, data: cartInfo };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching cart item: " + error.message,
    };
  }
};

export const updateWishlistCollection = async (
  userId,
  adminId,
  productId,
  action
) => {
  try {
    if (!userId || !adminId || !productId || !action) {
      throw new Error("Missing required fields");
    }

    // Find the shop and product
    const shop = await Product.findOne({
      _id: productId,
      addedBy: adminId,
    });

    if (!shop) {
      throw new Error("Shop or product not found");
    }

    // Find or create the user's wishlist
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
    }

    // Add or remove the product based on the action
    const existingItemIndex = wishlist.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (action === "add") {
      if (existingItemIndex === -1) {
        wishlist.items.push({ productId });
      } else {
        return { success: false, message: "Product already in wishlist" };
      }
    } else if (action === "remove") {
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
    return {
      success: false,
      message: "Error updating wishlist: " + error.message,
    };
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
        $lookup: {
          from: "subcategories", // Collection name for SubCategory model
          localField: "productDetails.subCategory",
          foreignField: "_id",
          as: "productDetails.subCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$productDetails.subCategoryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "maincategories", // Collection name for MainCategory model
          localField: "productDetails.subCategoryDetails.mainCategory",
          foreignField: "_id",
          as: "productDetails.mainCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$productDetails.mainCategoryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id", // Cart ID
          userId: { $first: "$userId" },
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
                weight: "$productDetails.weight",
                subCategory: "$productDetails.subCategoryDetails.name",
                mainCategory: "$productDetails.mainCategoryDetails.name",
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
          updatedAt: 1,
        },
      },
    ]);

    return { success: true, data: wishlistDetails };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching wishlist details: " + error.message,
    };
  }
};

export const fetchProductHelper = async (adminId) => {
  try {
    const result = await mongoose.model("Product").aggregate([
      {
        $match: {
          $or: [
            { addedBy: new mongoose.Types.ObjectId(adminId) },
            { addedBy: null },
          ],
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subCategory",
          foreignField: "_id",
          as: "subCategoryDetails",
        },
      },

      {
        $unwind: {
          path: "$subCategoryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "maincategories",
          localField: "subCategoryDetails.mainCategory",
          foreignField: "_id",
          as: "mainCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$mainCategoryDetails",
          preserveNullAndEmptyArrays: true,
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
          tags: 1,
          sku: 1,
          subCategoryDetails: 1,
          mainCategoryDetails: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return result;
  } catch (error) {
    if (error.isOperational) throw error;

    throw createAppError(`Error Fetching product: ${error.message}`, 500);
  }
};

export const getMainCategoriesHelper = async (adminId) => {
  try {
    const mainCategories = await MainCategory.find({
      $or: [{ createdBy: adminId }, { createdBy: null }],
    });
    return mainCategories;
  } catch (error) {
    throw createAppError(
      `Error fetching main categories: ${error.message}`,
      500
    ); // Internal server error
  }
};
