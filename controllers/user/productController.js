import {
  fetchProductHelper,
  fixedProductFixHelper,
  updateCartItemQuantity,
  deleteCartProduct,
  getUserCartItems,
} from "../../helper/user/productHelper.js";

export const fetchProductData = async (req, res, next) => {
  try {
    let { adminId, categoryId } = req.params; 

    if (!adminId && !categoryId) {
      return next(createAppError("Either adminId or categoryId is required", 400));
    }


    adminId = adminId === "null" ? undefined : adminId;
    categoryId = categoryId === "null" ? undefined : categoryId;

    const result = await fetchProductHelper(adminId, categoryId);
    res.status(200).json({ success: true, data: result });

  } catch (error) {
    next(error);
  }
};


export const fixedProductPrice = async (req, res, next) => {
  try {
    const { bookingData } = req.body;
    if (!bookingData) {
      return res.status(400).json({ message: "Booking data is required." });
    }
    const updatedProducts = await fixedProductFixHelper(bookingData);
    res.status(200).json({
      message: "Prices fixed successfully",
      updatedProducts,
    });
  } catch (error) {
    next(error);
  }
};

export const incrementCartItem = async (req, res, next) => {
  try {
    const { userId, adminId, productId } = req.params;
    const { quantity = 1 } = req.body;
    const { success, data, totalQuantity, message } =
      await updateCartItemQuantity(userId, adminId, productId, quantity);
    if (success) {
      res.status(200).json({
        success: true,
        message: "Item successfully added to cart",
        cart: data,
        totalQuantity: totalQuantity,
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
    const { success, data, totalQuantity, message } =
      await updateCartItemQuantity(userId, adminId, productId, quantity);
    if (success) {
      res.status(200).json({
        success: true,
        message: "Item successfully added to cart",
        cart: data,
        totalQuantity: totalQuantity,
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
    const { success, data, message } = await deleteCartProduct(
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

export const getUserCart = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { success, data, message } = await getUserCartItems(userId);
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
