import { Router } from "express";
import { userLoginController } from "../../controllers/admin/adminController.js";
import { getAdminDataController } from "../../controllers/admin/adminController.js";
import { updateAdminProfileController } from "../../controllers/admin/adminController.js"
import { updateLogo } from "../../controllers/admin/adminController.js";
import { uploadSingle } from "../../middleware/multer.js";
import { getServerController } from "../../controllers/admin/serverController.js";
import { updateSpread } from "../../controllers/admin/adminController.js";
import { getCommodityController } from "../../controllers/admin/adminController.js";
import { getSpotRate } from "../../controllers/admin/adminController.js";
import { updateCommodity } from "../../controllers/admin/adminController.js";
import { getSpotRateCommodity } from "../../controllers/admin/adminController.js";
import { deleteSpotRateCommodity, updateSpotRateCommodity } from "../../controllers/admin/spotRateController.js";
import { getMetalCommodity } from "../../controllers/admin/adminController.js";

const router = Router()

router.post('/login',userLoginController);
router.get('/data/:email', getAdminDataController);
router.put('/update-profile/:id', updateAdminProfileController);
router.post('/update-logo', uploadSingle('logo'), updateLogo);
router.get('/server-url',getServerController);
// router.post('/update-spotRate',getSpotRateData);
router.post('/update-spread', updateSpread);
router.get('/spotrates/:userId', getSpotRate);

router.get('/commodities/:email', getCommodityController);
router.post('/update-spotrate-commodity', updateCommodity);
router.get('/spotrates/:userId', getSpotRateCommodity);
router.patch('/update-spotrate-commodity/:userId/:commodityId', updateSpotRateCommodity);
router.delete('/commodities/:userId/:commodityId', deleteSpotRateCommodity);
router.get('metalCommodities/:email', getMetalCommodity);

export default router