import { Router } from "express";
import {
  adminLoginController,
  registerUser,
  userLoginController,
  updateSpread,
  deleteNotification
} from "../../controllers/Admin/adminController.js";
import { validateUser } from "../../middleware/validators.js";
const router = Router();

router.post("/login", adminLoginController);
router.post("/register/:adminId", validateUser, registerUser);
router.post("/login/:adminId",userLoginController);
router.patch('/update-spread/:adminId/:userId',updateSpread)
router.delete('/notifications/:adminId/:notificationId',deleteNotification)
export default router;
