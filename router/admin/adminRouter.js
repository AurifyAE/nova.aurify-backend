import { Router } from "express";
import {
    userLoginController,
    saveBankDetailsController,
    getAdminDataController,
    updateBankDetailsController,
    deleteBankDetailsController,
    getAdminFeaturesController
} from "../../controllers/Admin/adminController.js";

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
    deleteSpreadValueController
} from '../../controllers/Admin/adminController.js';

import { createShopItem, fetchShopItems, editShopItem, removeShopItem } from "../../controllers/admin/shopController.js";
import { uploadSingle } from "../../middleware/multer.js"; // Import the uploadSingle middleware

const router = Router()

router.post('/login', userLoginController)
router.post('/save-bank-details', saveBankDetailsController);
router.get('/data', getAdminDataController);
router.delete('/delete-bank-details', deleteBankDetailsController);
router.put('/update-bank-details', updateBankDetailsController);
router.get('/features', getAdminFeaturesController);

//news-routers
router.post('/add-manual-news', addManualNewsController);
router.get('/get-manual-news', getManualNewsController);
router.patch('/update-manual-news/:newsId/:newsItemId', updateManualNewsController);
router.delete('/delete-manual-news/:newsId/:newsItemId', deleteManualNewsController);

//user-customSpread-router
router.get('/admin/:adminId/users', fetchUsersForAdmin);
router.post('/admin/:adminId/spread-values', addCustomSpread);
router.get('/admin/:adminId/spread-values', fetchSpreadValues);
router.delete('/admin/spread-values/:spreadValueId', deleteSpreadValueController);

//Shop-router
router.post('/shop-items', uploadSingle('image'), createShopItem);
router.get('/shop-items', fetchShopItems);
router.patch('/shop-items/:id', uploadSingle('image'), editShopItem); // Add file upload support to edit as well
router.delete('/shop-items/:id', removeShopItem);



export default router
