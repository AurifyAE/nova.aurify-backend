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
} from "../../controllers/admin/categoryController.js";
import {
  getUserCommodity,
  updateUserSpread,
  addProduct
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
import { fetchUserOrder } from "../../controllers/user/orderController.js";
import { addVideoBanner, deleteVideoBanner, fetchVideoBanner } from "../../controllers/admin/bannerController.js";
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
router.patch("/products/:userSpotRateId", addProduct);

//category management
router.post("/addCategory/:adminId", addCategory);
router.put("/editCategory/:id/:adminId", editCategory);
router.delete("/deleteCategory/:id/:adminId", deleteCategory);
router.patch("/products/:categoryId", addProductDetail);

router.get("/getCategories/:adminId", getCategories);
//user spotrate router
router.get("/spotrates/:adminId/:categoryId", getUserCommodity);
router.post("/update-user-spread/:adminId/:categoryId", updateUserSpread);
//order management
router.get("/booking/:adminId", fetchBookings);
router.put("/update-order/:orderId", updateOrder);
router.put("/update-order-quantity/:orderId", updateOrderQuantity);
router.put("/update-order-reject/:orderId", updateOrderStatus);
router.post("/orders/confirm-quantity", orderQuantityConfirmation);
router.get("/fetch-order/:adminId/:userId", fetchUserOrder);
router.delete("/delete-order/:orderId", deleteOrder);
router.patch('/orders/:orderId/items/:itemId/reject', rejectOrderItem);
//Dashboard overview
router.get("/overview/:adminId", getDashboardOverview);

// Individual endpoint routes
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
export default router;
