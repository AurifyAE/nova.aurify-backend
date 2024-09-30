import { Router } from "express";
import {
  deleteBankDetailsController,
  getAdminDataController,
  getAdminFeaturesController,
  saveBankDetailsController,
  updateBankDetailsController,
} from "../../controllers/admin/adminController.js";

import {
  addManualNewsController,
  deleteManualNewsController,
  getManualNewsController,
  updateManualNewsController,
} from "../../controllers/admin/newsController.js";

import {
  adminTokenVerificationApi,
  fetchAdminDevice,
  fetchUsersForAdmin,
} from "../../controllers/admin/adminController.js";

import {
  adminLoginController,
  getPremiumDiscounts,
  premiumDiscounts,
} from "../../controllers/admin/adminController.js";
import { getBanner } from "../../controllers/admin/bannerController.js";
import { getServerController } from "../../controllers/admin/serverController.js";
import {
  createCommodity,
  deleteSpotRateCommodity,
  getCommodityController,
  getMetalCommodity,
  getSpotRate,
  updateCommodity,
  updateSpread,
} from "../../controllers/admin/spotRateController.js";
import { uploadSingle } from "../../middleware/multer.js";

import {
  addCategory,
  deleteCategory,
  editCategory,
  getCategories,
} from "../../controllers/admin/categoryController.js";
import {
  sendContactEmail,
  sendFeatureRequestEmail,
} from "../../controllers/admin/contactController.js";
import {
  getMessages,
  getUserAdmin,
  markAsRead,
} from "../../controllers/admin/messageController.js";
import {
  deleteNotification,
  getNotification,
} from "../../controllers/admin/notificationController.js";
import {
  getBackground,
  uploadBG,
} from "../../controllers/admin/previewController.js";
import {
  updateAdminProfileController,
  updateLogo,
} from "../../controllers/admin/profileController.js";
import {
  createShopItem,
  editShopItem,
  fetchShopItems,
  removeShopItem,
} from "../../controllers/admin/shopController.js";
import {
  addCustomSpread,
  deleteSpreadValueController,
  fetchSpreadValues,
} from "../../controllers/admin/spreadValuesController.js";
import {
  addUser,
  deleteUser,
  editUser,
  getUsers,
} from "../../controllers/admin/usersController.js";
import { getUserData } from "../../helper/admin/adminHelper.js";
import {
  validateContact,
  validateFeatureRequest,
} from "../../middleware/validators.js";

const router = Router();

//admin router
router.post("/login", adminLoginController);
router.post("/verify-token", adminTokenVerificationApi);
router.get("/data/:userName", getAdminDataController);
router.put("/update-profile/:id", updateAdminProfileController);
router.post("/update-logo", uploadSingle("logo"), updateLogo);
router.get("/server-url", getServerController);
router.post("/verify-token", adminTokenVerificationApi);

//spotrate routers
router.post("/update-spread", updateSpread);
router.get("/spotrates/:adminId", getSpotRate);
router.get("/commodities/:userName", getCommodityController);
router.post("/spotrate-commodity", createCommodity);
router.patch("/spotrate-commodity/:adminId/:commodityId", updateCommodity);
router.delete("/commodities/:adminId/:commodityId", deleteSpotRateCommodity);
router.get("metalCommodities/:userName", getMetalCommodity);

//Notification router
router.get("/notifications/:adminId", getNotification);
router.delete("/notifications/:adminId/:notificationId", deleteNotification);

//bank details
router.post("/save-bank-details", saveBankDetailsController);
router.delete("/delete-bank-details", deleteBankDetailsController);
router.put("/update-bank-details", updateBankDetailsController);

//features
router.get("/features", getAdminFeaturesController);
router.post(
  "/request-feature",
  validateFeatureRequest,
  sendFeatureRequestEmail
);

//banner
router.get("/banners/:adminId", getBanner);
router.get("/banners/:userId", getBanner);

//news-routers
router.post("/add-manual-news", addManualNewsController);
router.get("/get-manual-news", getManualNewsController);
router.patch(
  "/update-manual-news/:newsId/:newsItemId",
  updateManualNewsController
);
router.delete(
  "/delete-manual-news/:newsId/:newsItemId",
  deleteManualNewsController
);

//user router
router.get("/admin/:adminId/users", fetchUsersForAdmin);
router.get("/admin/:adminId/device", fetchAdminDevice);
router.post("/admin/:adminId/spread-values", addCustomSpread);
router.get("/admin/:adminId/spread-values", fetchSpreadValues);
router.delete(
  "/admin/spread-values/:spreadValueId/:userName",
  deleteSpreadValueController
);
// category router
router.post("/addCategory/:adminId", addCategory);
router.put("/editCategory/:id/:adminId", editCategory);
router.delete("/deleteCategory/:id/:adminId", deleteCategory);
router.get("/getCategories/:adminId", getCategories);
//user router
router.post("/admin/:adminId/users", addUser);
router.put("/admin/users/:userId/:adminId", editUser);
router.delete("/admin/users/:userId/:adminId", deleteUser);
router.get("/admin/:adminId/users", getUsers);

//shop router
router.post("/shop-items/:userName", uploadSingle("image"), createShopItem);
router.get("/shop-items/:userName", fetchShopItems);
router.patch("/shop-items/:id", uploadSingle("image"), editShopItem);
router.delete("/shop-items/:id", removeShopItem);

//contact router
router.post("/contact", validateContact, sendContactEmail);
router.get("/user-data", getUserData);

//messages router
router.get("/messages/:adminId/:userId", getMessages);
router.get("/user/:userId/:adminId", getUserAdmin);
router.post("/messages/markAsRead", markAsRead);

router.post("/upload/:userID", uploadBG);
router.get("/backgrounds/:userId", getBackground);

//premium and discount router
router.post("/premiumdiscounts/:userId", premiumDiscounts);
router.get("/premiumdiscounts/:userId", getPremiumDiscounts);

export default router;
