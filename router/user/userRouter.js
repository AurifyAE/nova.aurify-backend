import { Router } from "express";
import {
  registerUser,
  updateSpread,
  userLoginController,
  requestAdmin,
  getServerDetails,
  getCommodities,
  getCurrentNews,
  getSpotrateDetails,
  forgotPassword,
  fetchAdminBankDetails
} from "../../controllers/user/userController.js";
import {
  getProductDetails,
  addItemToCart,
  incrementCartItem,
  decrementCartItem,
  deleteCartItem,
  getUserCart,
  addItemToWishlist,
  getUserWishlist,
  deleteWishlist
} from "../../controllers/user/productController.js";

const router = Router();
router.post("/register/:adminId", registerUser);
router.post("/login/:adminId", userLoginController);
router.patch("/update-spread/:adminId/:userId", updateSpread);
router.post("/request-admin/:adminId", requestAdmin);
router.get("/get-spotrates/:adminId", getSpotrateDetails);
router.get("/get-banks/:adminId",fetchAdminBankDetails)
router.get("/get-news/:adminId", getCurrentNews);
router.get("/get-commodities/:adminId", getCommodities);
router.get("/get-server", getServerDetails);
router.get("/get-product/:adminId", getProductDetails);
router.get("/get-cart/:userId", getUserCart);
router.get("/get-wishlist/:userId", getUserWishlist);
router.post("/cart/:adminId/:userId/:productId", addItemToCart);
router.patch("/cart/increment/:adminId/:userId/:productId", incrementCartItem);
router.patch("/cart/decrement/:adminId/:userId/:productId", decrementCartItem);
router.delete("/cart/:adminId/:userId/:productId", deleteCartItem);
router.patch("/wishlist/:adminId/:userId/:productId", addItemToWishlist);
router.delete("/wishlist/:adminId/:userId/:productId", deleteWishlist);
router.put("/forgot-password/:adminId/:userId", forgotPassword);

export default router;
