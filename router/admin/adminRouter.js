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


import { fetchUsersForAdmin, fetchSpreadValues, addCustomSpread } from '../../controllers/Admin/adminController.js';


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



export default router