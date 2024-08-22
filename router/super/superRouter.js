import { Router } from "express";
import { editAdmin, registerAdmin,getAdmin } from "../../controllers/super/superAdminController.js";
import { uploadSingle } from "../../middleware/multer.js";
import {
  addServer,
  updateSelectedServer,
  deleteSelectedServer,
  editServer,
  fetchServerData,
} from "../../controllers/super/serverController.js";
import {
  addBanner,
  deleteBanner,
  editBannerDetails,
  fetchBanners
} from "../../controllers/super/bannerController.js";
const router = Router();

router.post("/register", uploadSingle("logo"), registerAdmin);
router.patch("/edit-admin/:adminId",uploadSingle("logo"), editAdmin)
router.get('/get-admin',getAdmin)
router.post("/add-server", addServer);
router.get('/fetch-server',fetchServerData)
router.patch("/update-selected-server/:serverId", updateSelectedServer);
router.delete("/delete-server/:serverId", deleteSelectedServer);
router.patch("/edit-server/:serverId", editServer);
router.post("/add-banners", uploadSingle("image"), addBanner);
router.delete("/banners/:bannerId/:adminId", deleteBanner);
router.put("/banners/:bannerId", uploadSingle("image"),editBannerDetails);
router.get('/get-banners',fetchBanners)
export default router;
