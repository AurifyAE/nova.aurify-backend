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
export default router;
