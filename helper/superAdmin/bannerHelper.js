import mongoose from "mongoose";
import BannerModel from "../../model/bannerSchema.js";
import NotificationModel from "../../model/notificationSchema.js";
import FCMTokenModel from "../../model/fcmTokenSchema.js";
import NotificationService from '../../utils/sendPushNotification.js'
export const addNewBanner = async (data) => {
  try {
    const { title, imageUrl, adminId } = data;
    const objectId = new mongoose.Types.ObjectId(adminId);

    // Find or create the banner document
    let bannerDoc = await BannerModel.findOne({ createdBy: objectId });
    if (bannerDoc) {
      bannerDoc.banner.push({ title, imageUrl });
    } else {
      bannerDoc = new BannerModel({
        banner: [{ title, imageUrl }],
        createdBy: objectId,
      });
    }
    await bannerDoc.save();

    const notificationMessage = `🎉 New banner ${title} added! Check it out now.`;

    // Create and save the notification
    let notificationDoc = await NotificationModel.findOne({
      createdBy: objectId,
    });
    if (notificationDoc) {
      notificationDoc.notification.push({
        message: notificationMessage,
      });
    } else {
      notificationDoc = new NotificationModel({
        notification: [
          {
            message: notificationMessage,
          },
        ],
        createdBy: objectId,
      });
    }
    await notificationDoc.save();

    const fcmTokens = await FCMTokenModel.findOne({ createdBy: objectId })
      .select("FCMTokens.token")
      .lean();

    if (fcmTokens && fcmTokens.FCMTokens.length > 0) {
      // Send push notifications to all tokens
      for (const tokenObj of fcmTokens.FCMTokens) {
        try {
          await NotificationService.sendNotification(
            tokenObj.token,
            "New Banner Added",
            notificationMessage,
            {
              bannerTitle: title,
              imageUrl: imageUrl,
            }
          );
        } catch (error) {
          console.error(`Failed to send notification to token: ${tokenObj.token}`, error);
        }
      }
    }

    return bannerDoc;
  } catch (error) {
    console.error("Error adding banner and sending notification:", error);
    throw new Error("Error adding banner and sending notification");
  }
};

export const removeBanner = async (bannerId, adminId) => {
  try {
    return await BannerModel.findOneAndUpdate(
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

export const updateBanner = async (data) => {
  try {
    const { title, imageUrl, bannerId, adminId } = data;

    return await BannerModel.findOneAndUpdate(
      { "banner._id": bannerId, createdBy: adminId },
      {
        $set: {
          "banner.$.title": title,
          "banner.$.imageUrl": imageUrl,
        },
      },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error editing banner details: ${error.message}`);
  }
};

export const fetchBannersDetails = async () => {
  try {
    return await BannerModel.find();
  } catch (error) {
    throw new Error("Error fetching Banner data");
  }
};
