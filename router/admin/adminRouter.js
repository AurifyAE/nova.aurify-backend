import { Router } from "express";
import {
    saveBankDetailsController,
    updateBankDetailsController,
    deleteBankDetailsController,
    getAdminDataController,
    getAdminFeaturesController,
    getNotification,
    deleteNotification,
    registerUser
} from "../../controllers/admin/adminController.js";

import {
    addManualNewsController,
    getManualNewsController,
    updateManualNewsController,
    deleteManualNewsController
} from "../../controllers/admin/newsController.js";

import {
    fetchUsersForAdmin,
    fetchSpreadValues,
    addCustomSpread,
    deleteSpreadValueController,
    adminTokenVerificationApi
} from '../../controllers/admin/adminController.js';
import { updateAdminProfileController } from "../../controllers/admin/adminController.js"
import { updateLogo } from "../../controllers/admin/adminController.js";
import { uploadSingle } from "../../middleware/multer.js";
import { getServerController } from "../../controllers/admin/serverController.js";
import { updateSpread } from "../../controllers/admin/adminController.js";
import { getCommodityController } from "../../controllers/admin/adminController.js";
import { getSpotRate } from "../../controllers/admin/adminController.js";
// import { updateCommodity } from "../../controllers/admin/adminController.js";
import { getSpotRateCommodity, createCommodity } from "../../controllers/admin/adminController.js";
import { deleteSpotRateCommodity, updateCommodity } from "../../controllers/admin/spotRateController.js";
import { getMetalCommodity } from "../../controllers/admin/adminController.js";
import { adminLoginController } from "../../controllers/admin/adminController.js";

import { getBanner } from "../../controllers/admin/bannerController.js";

import { createShopItem, fetchShopItems, editShopItem, removeShopItem } from "../../controllers/admin/shopController.js";

const router = Router()

router.post('/login',adminLoginController);
router.get('/data/:email', getAdminDataController);
router.put('/update-profile/:id', updateAdminProfileController);
router.post('/update-logo', uploadSingle('logo'), updateLogo);
router.get('/server-url',getServerController);
router.post('/verify-token',adminTokenVerificationApi)
// router.post('/update-spotRate',getSpotRateData);
router.post('/update-spread', updateSpread);
router.get('/spotrates/:userId', getSpotRate);
router.post('/user/:adminId',registerUser)
router.get('/commodities/:email', getCommodityController);
router.post('/spotrate-commodity', createCommodity);
router.get('/spotrates/:userId', getSpotRateCommodity);
router.patch('/spotrate-commodity/:userId/:commodityId', updateCommodity);
router.delete('/commodities/:userId/:commodityId', deleteSpotRateCommodity);
router.get('metalCommodities/:email', getMetalCommodity);

router.get('/notifications/:userId',getNotification);
router.delete('/notifications/:userId/:notificationId',deleteNotification);


router.post('/save-bank-details', saveBankDetailsController);
router.delete('/delete-bank-details', deleteBankDetailsController);
router.put('/update-bank-details', updateBankDetailsController);

router.get('/features', getAdminFeaturesController);

router.get('/banners/:userId',getBanner);


//news-routers
router.post('/add-manual-news', addManualNewsController);
router.get('/get-manual-news', getManualNewsController);
router.patch('/update-manual-news/:newsId/:newsItemId', updateManualNewsController);
router.delete('/delete-manual-news/:newsId/:newsItemId', deleteManualNewsController);

router.get('/admin/:adminId/users', fetchUsersForAdmin);
router.post('/admin/:adminId/spread-values', addCustomSpread);
router.get('/admin/:adminId/spread-values', fetchSpreadValues);
router.delete('/admin/spread-values/:spreadValueId', deleteSpreadValueController);

router.post('/shop-items', uploadSingle('image'), createShopItem);
router.get('/shop-items', fetchShopItems);
router.patch('/shop-items/:id', uploadSingle('image'), editShopItem); // Add file upload support to edit as well
router.delete('/shop-items/:id', removeShopItem);

export default router
