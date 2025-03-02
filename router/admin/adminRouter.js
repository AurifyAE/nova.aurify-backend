import { Router } from "express";
import {
  adminLoginController,
  adminTokenVerificationApi,
  getAdminDataController,
  saveBankDetailsController,
  deleteBankDetailsController,
  updateBankDetailsController,
} from "../../controllers/admin/adminController.js";
import {
  updateAdminProfileController,
  updateLogo,
} from "../../controllers/admin/profileController.js";
import { uploadMultiple, uploadSingle } from "../../middleware/multer.js";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  fetchAllProductData,
} from "../../controllers/admin/productController.js";
import {
  addUser,
  deleteUser,
  editUser,
  getUsers,
} from "../../controllers/admin/userController.js";
import {
  addCategory,
  deleteCategory,
  editCategory,
  getCategories,
} from "../../controllers/admin/categoryController.js";
import {
  getUserCommodity,
  updateUserSpread,
} from "../../controllers/admin/UserSpotRateController.js";
const router = Router();

router.post("/login", adminLoginController);
router.post("/verify-token", adminTokenVerificationApi);
router.get("/data/:userName", getAdminDataController);
router.put("/update-profile/:id", updateAdminProfileController);
router.post("/update-logo", uploadSingle("logo"), updateLogo);
//bank details
router.post(
  "/save-bank-details",
  uploadSingle("logo"),
  saveBankDetailsController
);
router.delete("/delete-bank-details", deleteBankDetailsController);
router.put(
  "/update-bank-details",
  uploadSingle("logo"),
  updateBankDetailsController
);
// product management
router.post("/add-products", uploadMultiple("image", 5), createProduct);
router.put("/edit-products/:id", uploadMultiple("image", 5), updateProduct);
router.delete("/delete-products/:id", deleteProduct);
router.get("/get-all-product/:adminId", fetchAllProductData);
//user management
router.post("/add-users/:adminId", addUser);
router.put("/edit-users/:userId/:adminId", editUser);
router.delete("/delete-users/:userId/:adminId", deleteUser);
router.get("/get-users/:adminId", getUsers);
//category management
router.post("/addCategory/:adminId", addCategory);
router.put("/editCategory/:id/:adminId", editCategory);
router.delete("/deleteCategory/:id/:adminId", deleteCategory);
router.get("/getCategories/:adminId", getCategories);
//user spotrate router
router.get("/spotrates/:adminId/:categoryId", getUserCommodity);
router.post("/update-user-spread/:adminId/:categoryId", updateUserSpread);

export default router;
