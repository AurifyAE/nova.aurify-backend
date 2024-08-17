import mongoose from "mongoose";
import BannerModel from "../../model/bannerSchema.js";
export const addNewBanner = async (data) => {
  try {
    const { title, imageUrl, adminId } = data;
    const objectId = new mongoose.Types.ObjectId(adminId);
    let bannerDoc = await BannerModel.findOne({ createdBy: objectId });
    if (bannerDoc) {
      // If a document exists, push the new banner into the banner array
      bannerDoc.banner.push({ title, imageUrl });
    } else {
      // If no document exists, create a new banner document
      bannerDoc = new BannerModel({
        banner: [{ title, imageUrl }], // Initialize the banner array with the new banner
        createdBy: objectId, // Set the createdBy field to the admin's ObjectId
      });
    }
    await bannerDoc.save();

    return bannerDoc;
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
