import { Router } from "express";
import { deviceManagementMiddleware } from "../../controllers/device/deviceController.js";


const router = Router()

router.get('/tv-screen',deviceManagementMiddleware)

export default router
