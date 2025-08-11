import { Router } from "express";
import {
  adminLoginController,
  adminTokenVerificationApi,
  getAdminDataController,
  saveBankDetailsController,
  deleteBankDetailsController,
  updateBankDetailsController,
} from "../../controllers/admin/adminController.js";
import {
  updateAdminProfileController,
  updateLogo,
} from "../../controllers/admin/profileController.js";
import { uploadMultiple, uploadSingle } from "../../middleware/multer.js";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  fetchAllProductData,
} from "../../controllers/admin/productController.js";
import {
  addUser,
  deleteUser,
  editUser,
  getUsers,
  getUserDetail,
  updateUserCashBalance,
  updateUserGoldBalance,
  updateReceivedMetrics,
} from "../../controllers/admin/userController.js";
import {
  addCategory,
  deleteCategory,
  editCategory,
  getCategories,
  addProductDetail,
  getSingleCategory,
  updateProductInCategory,
  deleteProductFromCategory,
} from "../../controllers/admin/categoryController.js";
import {
  getUserCommodity,
  updateUserSpread,
  addProduct,
  getAllUserSpotRates,
  updateUserSpotRateProduct,
  deleteUserSpotRateProduct,
} from "../../controllers/admin/UserSpotRateController.js";
import {
  fetchBookings,
  updateOrder,
  updateOrderQuantity,
  updateOrderStatus,
  orderQuantityConfirmation,
  deleteOrder,
  rejectOrderItem,
} from "../../controllers/admin/bookingController.js";
import {
  getDashboardOverview,
  getUserCount,
  getCompletedOrders,
  getTotalRevenue,
} from "../../controllers/admin/dashboardController.js";
import {
  fetchUserOrder,
  fetchUserTranstions,
} from "../../controllers/user/orderController.js";
import {
  addEcomBanner,
  deleteBanner,
  getBanner,
  updateBanner,
  fetchEcomBanner,
  addVideoBanner,
  deleteVideoBanner,
  fetchVideoBanner,
} from "../../controllers/admin/bannerController.js";
import {
  getSpotRate,
  updateSpread,
} from "../../controllers/admin/spotRateController.js";
const router = Router();

router.post("/login", adminLoginController);
router.post("/verify-token", adminTokenVerificationApi);
router.get("/data/:userName", getAdminDataController);
router.put("/update-profile/:id", updateAdminProfileController);
router.post("/update-logo", uploadSingle("logo"), updateLogo);
//bank details
router.post(
  "/save-bank-details",
  uploadSingle("logo"),
  saveBankDetailsController
);
router.delete("/delete-bank-details", deleteBankDetailsController);
router.put(
  "/update-bank-details",
  uploadSingle("logo"),
  updateBankDetailsController
);
//spotrate routers
router.post("/update-spread/:adminId", updateSpread);
router.get("/spotrates/:adminId", getSpotRate);
// product management
router.post("/add-products", uploadMultiple("image", 5), createProduct);
router.put("/edit-products/:id", uploadMultiple("image", 5), updateProduct);
router.delete("/delete-products/:id", deleteProduct);
router.get("/get-all-product/:adminId", fetchAllProductData);
//user management
router.post("/add-users/:adminId", addUser);
router.put("/edit-users/:userId/:adminId", editUser);
router.delete("/delete-users/:userId/:adminId", deleteUser);
router.get("/get-users/:adminId", getUsers);
router.get("/get-profile/:userId", getUserDetail);
router.patch("/receive-cash/:userId", updateUserCashBalance);
router.patch("/receive-gold/:userId", updateUserGoldBalance);
router.patch("/update-received-metrics/:userId", updateReceivedMetrics);
//category management
router.post("/addCategory/:adminId", addCategory);
router.put("/editCategory/:id/:adminId", editCategory);
router.delete("/deleteCategory/:id/:adminId", deleteCategory);
router.patch("/products/:categoryId", addProductDetail);
router.get("/getCategories/:adminId", getCategories);
router.get("/categories/:categoryId", getSingleCategory);
router.patch(
  "/categories/:categoryId/products/:productDetailId",
  updateProductInCategory
);
router.delete(
  "/categories/:categoryId/products/:productDetailId",
  deleteProductFromCategory
);
//user spotrate router
router.get("/spotrates/:adminId/:categoryId", getUserCommodity);
router.post("/update-user-spread/:adminId/:categoryId", updateUserSpread);
router.patch(
  "/user-spot-rate/:userSpotRateId?/user/:userId/product",
  addProduct
);
router.get("/user-spot-rates/:userId", getAllUserSpotRates);
router.put(
  "/user-spot-rate/:userSpotRateId/products/:Id",
  updateUserSpotRateProduct
);
router.delete(
  "/user-spot-rate/:userSpotRateId/products/:Id",
  deleteUserSpotRateProduct
);
//order management
router.get("/booking/:adminId", fetchBookings);
router.put("/update-order/:orderId/:adminId", updateOrder);
router.put("/update-order-quantity/:orderId/:adminId", updateOrderQuantity);
router.put("/update-order-reject/:orderId", updateOrderStatus);
router.post("/orders/confirm-quantity", orderQuantityConfirmation);
router.get("/fetch-order/:adminId/:userId", fetchUserOrder);
router.delete("/delete-order/:orderId", deleteOrder);
router.patch("/orders/:orderId/items/:itemId/reject", rejectOrderItem);
//Dashboard overview
router.get("/overview/:adminId", getDashboardOverview);
router.get("/users/:adminId", getUserCount);
router.get("/completed-orders/:adminId", getCompletedOrders);
router.get("/revenue/:adminId", getTotalRevenue);
// video banner
router.post(
  "/video-banner/create/:adminId",
  uploadMultiple("video", 5),
  addVideoBanner
);
router.get("/videoBanners/:adminId", fetchVideoBanner);
router.delete("/videoBanner/:bannerId/:adminId", deleteVideoBanner);
//banner
router.post("/addBanner", uploadMultiple("image", 5), addEcomBanner);
router.put("/banner/:id", uploadMultiple("image", 5), updateBanner);
router.delete("/banner/:id/:adminId", deleteBanner);
router.get("/banner/:adminId", fetchEcomBanner);
router.get("/fetch-transaction/:userId", fetchUserTranstions);

export default router;
