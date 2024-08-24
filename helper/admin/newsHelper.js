import newsModel from "../../model/newsSchema.js";
import adminModel from "../../model/adminSchema.js";
import { createAppError } from "../../utils/errorHandler.js";

export const addManualNews = async (email, title, description) => {
    try {
        const admin = await adminModel.findOne({ email });

        if (!admin) {
            throw createAppError("Admin not found.", 404);
        }

        let newsDoc = await newsModel.findOne({ createdBy: admin._id });

        if (newsDoc) {
            // If a document exists, push the new news item into the news array
            newsDoc.news.push({ title, description });
        } else {
            // If no document exists, create a new news document
            newsDoc = new newsModel({
                news: [{ title, description }],
                createdBy: admin._id,
            });
        }

        await newsDoc.save();
        return newsDoc;
    } catch (error) {
        throw createAppError("Error adding news: " + error.message, 500);
    }
};

export const getManualNews = async (email) => {
    try {
        const admin = await adminModel.findOne({ email });
        if (!admin) {
            throw createAppError("Admin not found.", 404);
        }
        const news = await newsModel.findOne({ createdBy: admin._id }).populate('createdBy', 'userName');
        return news;
    } catch (error) {
        console.error('Error in getManualNews:', error);
        throw createAppError("Error fetching news: " + error.message, 500);
    }
};

export const updateManualNews = async (email, newsId, newsItemId, updatedData) => {
    try {
        const admin = await adminModel.findOne({ email });
        if (!admin) {
            throw createAppError("Admin not found.", 404);
        }
        const result = await newsModel.findOneAndUpdate(
            { createdBy: admin._id, "news._id": newsItemId },
            {
                $set: {
                    "news.$.title": updatedData.title,
                    "news.$.description": updatedData.description,
                }
            },
            { new: true }
        );
        if (!result) {
            throw createAppError("News item not found or update failed.", 404);
        }

        return result;
    } catch (error) {
        throw createAppError("Error updating news: " + error.message, 500);
    }
};

export const deleteManualNews = async (email, newsId, newsItemId) => {
    try {
        const admin = await adminModel.findOne({ email });
        if (!admin) {
           throw createAppError("Admin not found.", 404);
        }
        const result = await newsModel.findOneAndUpdate(
            { createdBy: admin._id },
            {
                $pull: { news: { _id: newsItemId } }
            },
            { new: true }
        );

        if (!result) {
            console.log('News item not found or deletion failed.');
            throw createAppError("News item not found or deletion failed.", 404);
        }

        console.log('News item deleted successfully');
        return result;
    } catch (error) {
        console.error('Error in deleteManualNews:', error);
        throw createAppError("Error deleting news: " + error.message, 500);
    }
};