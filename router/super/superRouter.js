import { Router } from "express";
import {
  editAdmin,
  registerAdmin,
  getAdmin,
 
} from "../../controllers/super/superAdminController.js";
import { uploadSingle } from "../../middleware/multer.js";

const router = Router();

router.post("/register", uploadSingle("logo"), registerAdmin);
router.patch("/edit-admin/:adminId", uploadSingle("logo"), editAdmin);
router.get("/get-admin", getAdmin);


export default router;
