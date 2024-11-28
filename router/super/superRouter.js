import { Router } from "express";
import {
  editAdmin,
  registerAdmin,
  getAdmin,
  fetchDeviceAdmin,
  fetchDevice,
  changeDeviceStatus,
  deleteDevice,
} from "../../controllers/super/superAdminController.js";
import { uploadSingle ,uploadMultiple } from "../../middleware/multer.js";
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
  fetchBanners,
  getBannerAdmin,
} from "../../controllers/super/bannerController.js";
import {
  createMainCategory,
  createSubCategory,
  deleteMainCategory,
  deleteSubCategory,
  editMainCategory,
  editSubCategory,
  getMainCategories,
} from "../../controllers/super/categoryController.js";
import {
  createProduct,
  deleteProduct,
  fetchProductData,
  updateProduct,
} from "../../controllers/super/productController.js";
const router = Router();

router.post("/register", uploadSingle("logo"), registerAdmin);
router.patch("/edit-admin/:adminId", uploadSingle("logo"), editAdmin);
router.get("/get-admin", getAdmin);
router.get("/get-banner-admins", getBannerAdmin);

router.post("/add-server", addServer);
router.get("/fetch-server", fetchServerData);
router.get("/fetch-device-admin", fetchDeviceAdmin);
router.get("/fetch-device", fetchDevice);
router.patch("/update-device", changeDeviceStatus);
router.delete("/delete-device", deleteDevice);

router.patch("/update-selected-server/:serverId", updateSelectedServer);
router.delete("/delete-server/:serverId", deleteSelectedServer);
router.patch("/edit-server/:serverId", editServer);

router.post("/add-banners", uploadSingle("image"), addBanner);
router.delete("/banners/:bannerId/:adminId", deleteBanner);
router.put("/banners/:bannerId", uploadSingle("image"), editBannerDetails);
router.get("/get-banners", fetchBanners);


router.post("/main-category", uploadSingle("image"), createMainCategory);
router.put(
  "/main-category/:categoryId",
  uploadSingle("image"),
  editMainCategory
);
router.delete("/main-category/:categoryId", deleteMainCategory);
router.post("/sub-category", createSubCategory);
router.put("/sub-category/:subCategoryId", editSubCategory);
router.delete("/sub-category/:subCategoryId", deleteSubCategory);
router.get("/main-categories", getMainCategories);

router.get("/get-product/:mainCateId",fetchProductData);
router.post("/products",uploadMultiple('image',5), createProduct);
router.put("/products/:id",uploadMultiple('image',5), updateProduct);
router.delete("/products/:id", deleteProduct);
export default router;
