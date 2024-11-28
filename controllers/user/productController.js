import {
  fetchProductDetails,
  updateCartCollection,
  deleteCart,
  getUserCarts,
  updateWishlistCollection,
  getUserWishlists,
  deleteWishlistItem,
  fetchProductHelper,
  getMainCategoriesHelper
} from "../../helper/user/productHelper.js";

export const getProductDetails = async (req, res, next) => {
  try {
    const { mainCateId } = req.params;
    const { result, success } = await fetchProductDetails(mainCateId);
    if (!success || !result) {
      return res.status(404).json({
        success: false,
        message: "Products data not found",
      });
    }
    return res.status(200).json({
      success: true,
      info: result,
      message: "Fetching products successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const addItemToCart = async (req, res, next) => {
  try {
    const { userId, adminId, productId } = req.params;
    const { quantity = 1 } = req.body;
    const { success, data, message } = await updateCartCollection(
      userId,
      adminId,
      productId,
      quantity
    );
    if (success) {
      res.status(200).json({
        success: true,
        message: "Item successfully added to cart",
        cart: data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: message,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const incrementCartItem = async (req, res, next) => {
  try {
    const { userId, adminId, productId } = req.params;
    const { quantity = 1 } = req.body;
    const { success, data, message } = await updateCartCollection(
      userId,
      adminId,
      productId,
      quantity
    );
    if (success) {
      res.status(200).json({
        success: true,
        message: "Item successfully added to cart",
        cart: data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: message,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const decrementCartItem = async (req, res, next) => {
  try {
    const { userId, adminId, productId } = req.params;
    const { quantity = -1 } = req.body;
    const { success, data, message } = await updateCartCollection(
      userId,
      adminId,
      productId,
      quantity
    );
    if (success) {
      res.status(200).json({
        success: true,
        message: "Item successfully added to cart",
        cart: data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: message,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteCartItem = async (req, res, next) => {
  try {
    const { userId, adminId, productId } = req.params;
    const { success, data, message } = await deleteCart(
      userId,
      productId,
      adminId
    );
    if (success) {
      res.status(200).json({
        success: true,
        message: "Item deleted successfully from the cart.",
        cart: data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: message || "Failed to delete the item from the cart.",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteWishlist = async (req, res, next) => {
  try {
    const { userId, adminId, productId } = req.params;
    const { success, data, message } = await deleteWishlistItem(
      userId,
      productId,
      adminId
    );
    if (success) {
      res.status(200).json({
        success: true,
        message: "Item deleted successfully from the Wishlist.",
        cart: data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: message || "Failed to delete the item from the Wishlist.",
      });
    }
  } catch (error) {
    next(error);
  }
};
export const getUserCart = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { success, data, message } = await getUserCarts(userId);
    if (success) {
      res.status(200).json({
        success: true,
        message: "Item fetching successfully from the cart.",
        info: data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: message || "Failed to delete the item from the cart.",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const addItemToWishlist = async (req, res, next) => {
  try {
    const { userId, adminId, productId } = req.params;
    const { action } = req.query;
    const { success, data, message } = await updateWishlistCollection(
      userId,
      adminId,
      productId,
      action
    );
    if (success) {
      const actionMessage =
        action === "add" ? "Added to Wishlist" : "Removed from Wishlist";
      res.status(200).json({
        success: true,
        message: actionMessage,
        wishlist: data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: message,
      });
    }
  } catch (error) {
    next(error);
  }
};


export const getUserWishlist = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { success, data, message } = await getUserWishlists(userId);
    if (success) {
      res.status(200).json({
        success: true,
        message: "Item fetching successfully from the wishlist.",
        info: data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: message || "Failed to delete the item from the wishlist.",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const fetchProductData = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const result = await fetchProductHelper(adminId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getMainCategories = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const categories = await getMainCategoriesHelper(adminId);
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
