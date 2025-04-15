import { Router } from "express";
import {
  fixedProductPrice,
  fetchProductData,
  incrementCartItem,
  decrementCartItem,
  deleteCartItem,
  getUserCart,
  updateCartQuantity
} from "../../controllers/user/productController.js";

import {
  fetchAdminBankDetails,
  forgotPassword,
  requestAdmin,
  userLoginController,
  getProfile,
  fetchProductCount,
  getVideoBanner,
  getNotifications,
  readNotification,
  removeNotification,
  clearAllNotifications
} from "../../controllers/user/userController.js";
import { saveBooking } from "../../controllers/user/bookingController.js";
import {
  fetchUserOrder,
  fetchUserTranstions 
} from "../../controllers/user/orderController.js";
import { orderQuantityConfirmation } from "../../controllers/admin/bookingController.js";
const router = Router();

router.post("/login/:adminId", userLoginController);
router.post("/request-admin/:adminId", requestAdmin);
router.get("/get-banks/:adminId", fetchAdminBankDetails);
router.get("/get-product/:adminId?/:categoryId?", fetchProductData);
router.get("/product-count/:categoryId", fetchProductCount);
router.put("/forgot-password/:adminId", forgotPassword);
router.get("/get-profile/:adminId", getProfile);
router.get("/get-VideoBanner/:adminId", getVideoBanner);
// cart Management
router.get("/get-cart/:userId", getUserCart);
router.patch("/cart-increment/:adminId/:userId/:productId", incrementCartItem);
router.put("/cart/update-quantity/:adminId/:userId/:productId", updateCartQuantity);
router.patch("/cart-decrement/:adminId/:userId/:productId", decrementCartItem);
router.delete("/delete-cart/:adminId/:userId/:productId", deleteCartItem);
//order management
router.post("/booking/:adminId/:userId", saveBooking);
router.put("/products/fix-prices", fixedProductPrice);
router.post("/order_quantity_confirmation", orderQuantityConfirmation);
router.get("/fetch-order/:adminId/:userId", fetchUserOrder);
router.get("/fetch-transtion/:userId", fetchUserTranstions);

//notifications management
router.get("/notifications/:userId", getNotifications);
router.patch("/notifications/read/:userId/:notificationId", readNotification);
router.delete("/notifications/:userId/:notificationId", removeNotification);
router.delete("/notifications/:userId", clearAllNotifications);
export default router;
