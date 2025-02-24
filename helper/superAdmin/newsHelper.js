import mongoose from "mongoose";
import newsModel from "../../model/newsSchema.js";


export const addNews = async ({ title, description }) => {
  try {
    const news = new newsModel({
      news: [{ title, description }],
      isAutomated:true,
      createdBy: null,
    });
    await news.save();
    return { success: true, news, message: "News added successfully" };
  } catch (error) {
    return { success: false, message: "Error adding news: " + error.message };
  }
};


export const updateNews = async (newsId,parentId, updateData) => {
    try {
    
      const news = await newsModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(parentId), "news._id": new mongoose.Types.ObjectId(newsId) },
        {
          $set: {
            "news.$.title": updateData.title,
            "news.$.description": updateData.description,
          },
        },
        { new: true }
      );
  
      if (!news) {
        return { success: false, message: "News or news item not found" };
      }
  
      return { success: true, news, message: "News updated successfully" };
    } catch (error) {
      return { success: false, message: "Error updating news: " + error.message };
    }
  };
  

export const deleteNews = async (newsId) => {
  try {
    const news = await newsModel.findByIdAndDelete(newsId);
    if (!news) {
      return { success: false, message: "News not found" };
    }
    return { success: true, message: "News deleted successfully" };
  } catch (error) {
    return { success: false, message: "Error deleting news: " + error.message };
  }
};


export const getAllNews = async () => {
    try {
      const news = await newsModel.find({ createdBy: null }).sort({ createdAt: -1 });
  
      return { success: true, news, message: "Automated news fetched successfully" };
    } catch (error) {
      return { success: false, message: "Error fetching news: " + error.message };
    }
  };
  
