import { Router } from "express";
import { registerUser,updateSpread,userLoginController,requestAdmin } from "../../controllers/user/userController.js";



const router = Router()
router.post('/register/:adminId',registerUser)
router.post('/login/:adminId',userLoginController)
router.patch('/update-spread/:adminId/:userId',updateSpread)
router.post('/request-admin/:adminId',requestAdmin)

export default router
