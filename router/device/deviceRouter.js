import { Router } from "express";
import { activateDeviceController } from "../../controllers/device/deviceController.js";
import { deviceManagementMiddleware } from "../../middleware/deviceManage.js";


const router = Router()

router.get('/tv-screen',deviceManagementMiddleware,activateDeviceController)

export default router
