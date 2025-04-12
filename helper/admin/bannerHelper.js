import mongoose from "mongoose";
import { VideoBannerModel } from "../../model/videoBannerSchema.js";
import { videoManager } from "../../utils/s3video.js";

export const addVideoBannerHelper = async (data) => {
    try {
      const objectId = new mongoose.Types.ObjectId(data.createdBy);
      let bannerDoc = await VideoBannerModel.findOne({ createdBy: objectId });
  
      const newBanner = {
        title: data.title,
        videos: data.videos.map((video) => ({
          key: video.key,
          location: video.location,
        })),
      };
  
      if (bannerDoc) {
        // Append the new banner data to the existing document
        bannerDoc.banner.push(newBanner);
      } else {
        // Create a new document if none exists
        bannerDoc = new VideoBannerModel({
          banner: [newBanner],
          createdBy: objectId,
        });
      }
  
      await bannerDoc.save();
      return bannerDoc;
    } catch (error) {
      throw new Error("Error during banner creation: " + error.message);
    }
  };
  
  export const deleteVideoBannerHelper = async (adminId, bannerId) => {
    try {
      // Find the video banner document that contains the specified banner ID
      const videoBanner = await VideoBannerModel.findOne({
        "banner._id": bannerId,
        createdBy: adminId
      });
  
      if (!videoBanner) {
        throw new Error("Banner not found");
      }
  
      // Find the specific banner in the array
      const targetBanner = videoBanner.banner.find(
        (b) => b._id.toString() === bannerId
      );
  
      if (!targetBanner) {
        throw new Error("Banner not found in the document");
      }
  
  
      // Delete all videos from S3
      for (const video of targetBanner.videos) {
        try {
          await videoManager.deleteVideo(video.key);
        } catch (error) {
          console.error(`Failed to delete video ${video.key} from S3:`, error);
          // Continue with other deletions even if one fails
        }
      }
  
      // Remove the banner from the array
      const updatedBanner = await VideoBannerModel.findOneAndUpdate(
        { "banner._id": bannerId },
        { $pull: { banner: { _id: bannerId } } },
        { new: true }
      );
  
      if (!updatedBanner) {
        throw new Error("Failed to update banner document");
      }
  
      return {
        success: true,
        message: "Banner and associated videos deleted successfully"
      };
  
    } catch (error) {
      console.error("Error in deleteVideoBannerHelper:", error);
      throw new Error(`Error deleting banner: ${error.message}`);
    }
  };