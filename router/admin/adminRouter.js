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

// import { createShopItem, fetchShopItems, editShopItem, removeShopItem } from "../../controllers/admin/shopController.js";

const router = Router()

router.post('/login', userLoginController)
router.post('/save-bank-details', saveBankDetailsController);
router.get('/data', getAdminDataController);
router.delete('/delete-bank-details', deleteBankDetailsController);
router.put('/update-bank-details', updateBankDetailsController);
router.get('/features', getAdminFeaturesController);

router.post('/add-manual-news', addManualNewsController);
router.get('/get-manual-news', getManualNewsController);
router.patch('/update-manual-news/:newsId/:newsItemId', updateManualNewsController);
router.delete('/delete-manual-news/:newsId/:newsItemId', deleteManualNewsController);

router.get('/admin/:adminId/users', fetchUsersForAdmin);
router.post('/admin/:adminId/spread-values', addCustomSpread);
router.get('/admin/:adminId/spread-values', fetchSpreadValues);
router.delete('/admin/spread-values/:spreadValueId', deleteSpreadValueController);


// router.post('/shop', createShopItem);
// router.get('/shop', fetchShopItems);
// router.put('/shop/:id', editShopItem);
// router.delete('/shop/:id', removeShopItem);

// router.use('/admin/shop', shopRouter);

export default router
