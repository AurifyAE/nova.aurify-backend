import { Router } from "express";
import { registerAdmin } from "../../controllers/super/superAdminController.js";
import { uploadSingle } from "../../middleware/multer.js";
import {
  addServer,
  updateSelectedServer,
  deleteSelectedServer,
  editServer,
} from "../../controllers/super/serverController.js";
import {
  addBanner,
  deleteBanner,
  editBannerDetails,
} from "../../controllers/super/bannerController.js";
const router = Router();

router.post("/register", uploadSingle("logo"), registerAdmin);
router.post("/add-server", addServer);
router.patch("/update-selected-server", updateSelectedServer);
router.delete("/delete-server/:serverId", deleteSelectedServer);
router.patch("/edit-server/:serverId", editServer);
router.post("/add-banners", uploadSingle("image"), addBanner);
router.delete("/banners/:bannerId", deleteBanner);
router.put("/banners/:bannerId", uploadSingle("image"),editBannerDetails);

export default router;
