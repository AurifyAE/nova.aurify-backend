import mongoose from "mongoose";
import { EcommerceBannerModel } from "../../model/EcommerceBannerSchema.js";
export const addEcomBannerHelper = async (data) => {
  try {
    const objectId = new mongoose.Types.ObjectId(data.createdBy);
    let bannerDoc = await EcommerceBannerModel.findOne({ createdBy: objectId });
    if (bannerDoc) {
      bannerDoc.banner.push({
        title: data.title,
        imageUrl: data.imageUrls || [],
      });
    } else {
      bannerDoc = new EcommerceBannerModel({
        banner: [
          {
            title: data.title,
            imageUrl: data.imageUrls || [],
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
    return await EcommerceBannerModel.findOneAndUpdate(
      { "banner._id": bannerId, createdBy: updateData.createdBy },
      {
        $set: {
          "banner.$.title": updateData.title,
          "banner.$.imageUrl": updateData.imageUrls,
        },
      },
      { new: true }
    );
  } catch (error) {
    throw new Error("Error updating banner: " + error.message);
  }
};

export const deleteBannerHelper = async (adminId, bannerId) => {
  try {
    return await EcommerceBannerModel.findOneAndUpdate(
      { createdBy: adminId },
      {
        $pull: { banner: { _id: bannerId } },
      },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error deleting banner: ${error.message}`);
  }
};
