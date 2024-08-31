import newsModel from "../../model/newsSchema.js";
import { spotRateModel } from "../../model/spotRateSchema.js";

export const getSportrate = async (adminId) => {
  try {
    const fetchSpotRate = await spotRateModel.findOne({ createdBy: adminId });

    if (!fetchSpotRate) {
      return { success: false, fetchSpotRate: null };
    }

    return { success: true, fetchSpotRate };
  } catch (error) {
    throw new Error("Error fetching SpotRate: " + error.message);
  }
};

export const getNewsByAdminId = async (adminId) => {
  try {
    const news = await newsModel.findOne({ createdBy: adminId });

    if (!news) {
      return {
        success: false,
        news: null,
        message: "No news found for this admin",
      };
    }

    return {
      success: true,
      news,
      message: "News fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      news: null,
      message: "Error fetching news: " + error.message,
    };
  }
};
