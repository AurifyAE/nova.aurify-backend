import mongoose from "mongoose";
import BannerModel from "../../model/bannerSchema.js";
export const addNewBanner = async (data) => {
  try {
    const { title, imageUrl, adminId } = data;
    const objectId = new mongoose.Types.ObjectId(adminId);
    const createBannerCollection = new BannerModel({
      title,
      imageUrl,
      createdBy: objectId,
    });
    await createBannerCollection.save();
    return createBannerCollection;
  } catch (error) {
    throw new Error("Error adding banner");
  }
};

export const removeBanner = async (bannerId) => {
  try {
    const objectId = new mongoose.Types.ObjectId(bannerId);
    return await BannerModel.findByIdAndDelete(objectId);
  } catch (error) {
    throw new Error(`Error deleting banner: ${error.message}`);
  }
};

export const updateBanner = async (data) => {
  try {
    const { title, imageUrl, bannerId } = data;
    const objectId = new mongoose.Types.ObjectId(bannerId);
    return await BannerModel.findByIdAndUpdate(
      objectId,
      { title, imageUrl },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error editing server details: ${error.message}`);
  }
};
