import { Router } from "express";
import { activateDeviceController,getSpotrateDetails,getCurrentNews,getServerDetails,getCommodities, getPremiumDiscounts } from "../../controllers/device/deviceController.js";
import { deviceManagementMiddleware } from "../../middleware/deviceManage.js";


const router = Router()

router.get('/tv-screen',deviceManagementMiddleware,activateDeviceController)
router.get('/get-spotrates/:adminId',getSpotrateDetails)
router.get('/get-news/:adminId',getCurrentNews)
router.get('/get-commodities/:adminId',getCommodities)
router.get('/get-server',getServerDetails)
router.get('/get-premium-discount/:adminId',getPremiumDiscounts)

export default router
