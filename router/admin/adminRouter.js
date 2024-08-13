import { Router } from "express";
import { userLoginController } from "../../controllers/Admin/adminController.js";
const router = Router()

router.post('/login',userLoginController)

export default router