import { Router } from "express";
import { activateDeviceController,getSpotrateDetails,getCurrentNews,getServerDetails } from "../../controllers/device/deviceController.js";
import { deviceManagementMiddleware } from "../../middleware/deviceManage.js";


const router = Router()

router.get('/tv-screen',deviceManagementMiddleware,activateDeviceController)
router.get('/get-spotrates/:adminId',getSpotrateDetails)
router.get('/get-news/:adminId',getCurrentNews)
router.get('/get-server',getServerDetails)

export default router
