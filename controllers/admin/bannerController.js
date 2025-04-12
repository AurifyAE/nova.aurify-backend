import { addVideoBannerHelper,deleteVideoBannerHelper } from "../../helper/admin/bannerHelper.js";
import {VideoBannerModel} from '../../model/videoBannerSchema.js'
export const addVideoBanner = async (req, res, next) => {
    try {
      const { title } = req.body;
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one video is required",
        });
      }
  
      const videos = req.files.map((file) => ({
        key: file.key,
        location: file.location,
      }));
  
      const videobannerData = {
        title,
        videos,
        createdBy: req.params.adminId,
      };
  
      const result = await addVideoBannerHelper(videobannerData);
  
      res.status(201).json({
        success: true,
        message: "Video banner added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
  
  export const fetchVideoBanner = async (req, res) => {
    try {
      const { adminId } = req.params;
  
      const banner = await VideoBannerModel.findOne({ createdBy: adminId });
      if (!banner || banner.banner.length === 0) {
        return res
          .status(204)
          .json({
            success: false,
            message: "No Video Banners found for this user",
          });
      }
      res.status(200).json({ success: true, data: banner.banner });
    } catch (error) {
      console.error("Error fetching Video Banners:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to fetch Video Banners",
          error,
        });
    }
  };
  
  export const deleteVideoBanner = async (req, res, next) => {
    try {
      const bannerId = req.params.bannerId;
      const adminId = req.params.adminId;
      const { success, message } = await deleteVideoBannerHelper(
        adminId,
        bannerId
      );
  
      res.status(200).json({
        success: success,
        message: message,
      });
    } catch (error) {
      next(error);
    }
  };