import { Router } from "express";
import {
  adminLoginController,
  registerUser,
  userLoginController,
  updateSpread
} from "../../controllers/Admin/adminController.js";
import { validateUser } from "../../middleware/validators.js";
const router = Router();

router.post("/login", adminLoginController);
router.post("/register/:adminId", validateUser, registerUser);
router.post("/login/:adminId",userLoginController);
router.patch('/update-spread/:adminId/:userId',updateSpread)
export default router;
