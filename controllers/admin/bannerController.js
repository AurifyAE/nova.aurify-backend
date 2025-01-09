import { addEcomBannerHelper,deleteBannerHelper,updateBannerHelper } from "../../helper/admin/bannerHelper.js";
import BannerModel from "../../model/bannerSchema.js";

export const getBanner = async (req, res) => {
  try {
    const { adminId } = req.params;

    const banner = await BannerModel.findOne({ createdBy: adminId });
    if (!banner || banner.banner.length === 0) {
      return res
        .status(204)
        .json({ success: false, message: "No banners found for this user" });
    }
    res.status(200).json({ success: true, data: banner.banner });
  } catch (error) {
    console.error("Error fetching banners:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch banners", error });
  }
};

export const addEcomBanner = async (req, res, next) => {
  try {
    const { title } = req.body;
    const imageUrls = req.files.map((file) => file.location);
    
    if (!imageUrls.length) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required"
      });
    }

    const bannerData = {
      title,
      imageUrls,
      createdBy: req.body.adminId
    };

    const result = await addEcomBannerHelper(bannerData);
    res.status(201).json({
      success: true,
      message: "Banner added successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateBanner = async (req, res, next) => {
  try {
    const bannerId = req.params.id;
    const { title, existingImages } = req.body;
    
    // Combine existing images that weren't deleted with new uploaded images
    const newImageUrls = req.files?.map(file => file.location) || [];
    const imageUrls = [...(existingImages || []), ...newImageUrls];

    if (!imageUrls.length) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required"
      });
    }

    const updateData = {
      title,
      imageUrls,
      createdBy: req.body.adminId
    };

    const result = await updateBannerHelper(bannerId, updateData);
    
    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const bannerId = req.params.id;
    const adminId = req.params.adminId;
    await deleteBannerHelper(adminId,bannerId);
    
    res.status(200).json({
      success: true,
      message: "Banner deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};