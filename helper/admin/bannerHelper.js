import mongoose from "mongoose";
import { VideoBannerModel } from "../../model/videoBannerSchema.js";
import { EcommerceBannerModel } from "../../model/EcommerceBannerSchema.js";
import { videoManager } from "../../utils/s3video.js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createAppError } from "../../utils/errorHandler.js";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const deleteS3Image = async (key) => {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });
    await s3.send(deleteCommand);
    console.log(`Successfully deleted image with key: ${key} from S3`);
  } catch (error) {
    console.error(`Error deleting image from S3: ${error.message}`);
    throw createAppError(`Failed to delete image from S3: ${error.message}`, 500);
  }
};

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
      createdBy: adminId,
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
      message: "Banner and associated videos deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteVideoBannerHelper:", error);
    throw new Error(`Error deleting banner: ${error.message}`);
  }
};

export const addEcomBannerHelper = async (data) => {
  try {
    const objectId = new mongoose.Types.ObjectId(data.createdBy);
    let bannerDoc = await EcommerceBannerModel.findOne({ createdBy: objectId });
    if (bannerDoc) {
      bannerDoc.banner.push({
        title: data.title,
        images: data.imageUrls || [],
      });
    } else {
      bannerDoc = new EcommerceBannerModel({
        banner: [
          {
            title: data.title,
            images: data.imageUrls || [],
          },
        ],
        createdBy: objectId,
      });
    }
    await bannerDoc.save();
    return bannerDoc;
  } catch (error) {
    throw new Error("Error during create banner: " + error.message);
  }
};

export const updateBannerHelper = async (bannerId, updateData) => {
  try {
    // First, get the current banner to identify images that need to be deleted
    const currentBanner = await EcommerceBannerModel.findOne({
      "banner._id": bannerId,
      createdBy: updateData.createdBy
    });
    
    if (!currentBanner) {
      throw createAppError("Banner not found", 404);
    }
    
    // Find the specific banner in the array
    const bannerToUpdate = currentBanner.banner.find(
      banner => banner._id.toString() === bannerId
    );
    
    if (!bannerToUpdate) {
      throw createAppError("Banner not found in the document", 404);
    }
    
    // Get existing image keys
    const existingImageKeys = bannerToUpdate.images.map(img => img.key);
    
    // Get new image keys from updateData
    const newImageKeys = updateData.images.map(img => img.key);
    
    // Find keys that need to be deleted (exist in old but not in new)
    const keysToDelete = existingImageKeys.filter(key => 
      !newImageKeys.includes(key)
    );
    
    // Delete old images from S3
    for (const key of keysToDelete) {
      await deleteS3Image(key);
    }
    
    // Update the banner in MongoDB
    return await EcommerceBannerModel.findOneAndUpdate(
      { "banner._id": bannerId, createdBy: updateData.createdBy },
      {
        $set: {
          "banner.$.title": updateData.title,
          "banner.$.images": updateData.images,
        },
      },
      { new: true }
    );
  } catch (error) {
    if (error.name === 'AppError') throw error;
    throw createAppError(`Error updating banner: ${error.message}`, 500);
  }
};

export const deleteBannerHelper = async (adminId, bannerId) => {
  try {
    // First, get the banner to retrieve image keys
    const currentBanner = await EcommerceBannerModel.findOne({
      createdBy: adminId,
      "banner._id": bannerId
    });
    
    if (!currentBanner) {
      throw createAppError("Banner not found", 404);
    }
    
    // Find the specific banner in the array
    const bannerToDelete = currentBanner.banner.find(
      banner => banner._id.toString() === bannerId
    );
    
    if (!bannerToDelete) {
      throw createAppError("Banner not found in the document", 404);
    }
    
    // Delete all images from S3
    for (const image of bannerToDelete.images) {
      await deleteS3Image(image.key);
    }
    
    // Now remove the banner from MongoDB
    return await EcommerceBannerModel.findOneAndUpdate(
      { createdBy: adminId },
      {
        $pull: { banner: { _id: bannerId } },
      },
      { new: true }
    );
  } catch (error) {
    if (error.name === 'AppError') throw error;
    throw createAppError(`Error deleting banner: ${error.message}`, 500);
  }
};
