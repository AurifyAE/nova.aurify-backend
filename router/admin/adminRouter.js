import { Router } from "express";
import {
  saveBankDetailsController,
  updateBankDetailsController,
  deleteBankDetailsController,
  getAdminDataController,
  getAdminFeaturesController,
  getNotification,
  deleteNotification,
} from "../../controllers/admin/adminController.js";

import {
  addManualNewsController,
  getManualNewsController,
  updateManualNewsController,
  deleteManualNewsController,
} from "../../controllers/admin/newsController.js";

import {
  fetchUsersForAdmin,
  fetchSpreadValues,
  addCustomSpread,
  deleteSpreadValueController,
  adminTokenVerificationApi,
} from "../../controllers/admin/adminController.js";
import { updateAdminProfileController } from "../../controllers/admin/adminController.js";
import { updateLogo } from "../../controllers/admin/adminController.js";
import { uploadSingle } from "../../middleware/multer.js";
import { getServerController } from "../../controllers/admin/serverController.js";
import { updateSpread } from "../../controllers/admin/adminController.js";
import { getCommodityController } from "../../controllers/admin/adminController.js";
import { getSpotRate } from "../../controllers/admin/adminController.js";
// import { updateCommodity } from "../../controllers/admin/adminController.js";
import {
  getSpotRateCommodity,
  createCommodity,
} from "../../controllers/admin/adminController.js";
import {
  deleteSpotRateCommodity,
  updateCommodity,
} from "../../controllers/admin/spotRateController.js";
import { getMetalCommodity } from "../../controllers/admin/adminController.js";
import { adminLoginController } from "../../controllers/admin/adminController.js";

import { getBanner } from "../../controllers/admin/bannerController.js";

import {
  createShopItem,
  fetchShopItems,
  editShopItem,
  removeShopItem,
} from "../../controllers/admin/shopController.js";
import { validateContact } from "../../middleware/validators.js";
import { sendContactEmail } from "../../controllers/admin/contactController.js";
import { getUserData } from "../../helper/admin/adminHelper.js";
import {
  getMessages,
  storeMessage,
} from "../../controllers/admin/messageController.js";

const router = Router();

router.post("/login", adminLoginController);
router.post("/verify-token", adminTokenVerificationApi);
router.get("/data/:email", getAdminDataController);
router.put("/update-profile/:id", updateAdminProfileController);
router.post("/update-logo", uploadSingle("logo"), updateLogo);
router.get("/server-url", getServerController);
router.post("/verify-token", adminTokenVerificationApi);
router.post("/update-spread", updateSpread);
router.get("/spotrates/:adminId", getSpotRate);
router.get("/commodities/:email", getCommodityController);
router.post("/spotrate-commodity", createCommodity);
router.patch("/spotrate-commodity/:adminId/:commodityId", updateCommodity);
router.delete("/commodities/:adminId/:commodityId", deleteSpotRateCommodity);
router.get("metalCommodities/:email", getMetalCommodity);
router.get("/notifications/:adminId", getNotification);
router.delete("/notifications/:adminId/:notificationId", deleteNotification);
router.post("/save-bank-details", saveBankDetailsController);
router.delete("/delete-bank-details", deleteBankDetailsController);
router.put("/update-bank-details", updateBankDetailsController);

router.post("/save-bank-details", saveBankDetailsController);
router.delete("/delete-bank-details", deleteBankDetailsController);
router.put("/update-bank-details", updateBankDetailsController);

router.get("/features", getAdminFeaturesController);

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

router.get("/admin/:adminId/users", fetchUsersForAdmin);
router.post("/admin/:adminId/spread-values", addCustomSpread);
router.get("/admin/:adminId/spread-values", fetchSpreadValues);
router.delete(
  "/admin/spread-values/:spreadValueId",
  deleteSpreadValueController
);

router.post("/shop-items/:email", uploadSingle("image"), createShopItem);
router.get("/shop-items", fetchShopItems);
router.patch("/shop-items/:id", uploadSingle("image"), editShopItem);
router.delete("/shop-items/:id", removeShopItem);

router.post("/contact", validateContact, sendContactEmail);
router.get("/user-data", getUserData);

router.get("/messages/:adminId/:userId", getMessages);
router.post("/messages/:userId", storeMessage);

export default router;
