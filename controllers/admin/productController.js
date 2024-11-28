import {
    createProductHelper,
    updateProductHelper,
    deleteProductHelper,
    fetchProductsByMainCategory,
    fetchProductsBySubCategory,
  } from "../../helper/admin/productHelper.js";
  
  // Create a new product
  export const createProduct = async (req, res, next) => {
    try {
      const productData = req.body;
      const imageLocations = req.files.map((file) => file.location); // Assuming `req.file.location` provides the image URL
      productData.images = imageLocations;
      const product = await createProductHelper(productData);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error); // Pass error to global error handler
    }
  };
  
  // Update product
  export const updateProduct = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
  
      // Handle uploaded files (e.g., image uploads)
      if (req.files?.length > 0) {
        const imageLocations = req.files.map((file) => file.location); // Assuming file.location contains the URL
        updateData.images = imageLocations;
      }
  
      // Call helper to handle update logic
      const updatedProduct = await updateProductHelper(id, updateData);
  
      if (!updatedProduct) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      res.status(200).json({ success: true, data: updatedProduct });
    } catch (error) {
      next(error);
    }
  };
  
  
  // Delete product (soft delete)
  export const deleteProduct = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await deleteProductHelper(id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };


  export const fetchProductData = async (req, res, next) => {
    try {
      const { mainCateId, subCateId } = req.query;
      if (!mainCateId && !subCateId) {
        throw new Error("Either mainCateId or subCateId is required");
      }
      let result;
      if (subCateId) {
        result = await fetchProductsBySubCategory(subCateId);
      } else if (mainCateId) {
        result = await fetchProductsByMainCategory(mainCateId);
      }
  
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
  