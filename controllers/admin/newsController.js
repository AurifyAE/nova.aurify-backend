import {
    addManualNews,
    getManualNews,
    updateManualNews,
    deleteManualNews
} from "../../helper/admin/newsHelper.js";
import { createAppError } from "../../utils/errorHandler.js";


export const addManualNewsController = async (req, res, next) => {
    try {
        const { userName, title, description } = req.body;

        if (!userName || !title || !description) {
            throw createAppError("userName, title, and description are required.", 400);
        }

        const newNews = await addManualNews(userName, title, description);

        res.status(201).json({
            success: true,
            message: "News added successfully",
            data: newNews
        });
    } catch (error) {
        next(error);
    }
};

export const getManualNewsController = async (req, res, next) => {
    try {
        const userName = req.query.userName;
        const news = await getManualNews(userName);

        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        next(error);
    }
};


export const updateManualNewsController = async (req, res, next) => {
    try {
        const { newsId, newsItemId } = req.params;
        const { userName, title, description } = req.body;

        const updatedNews = await updateManualNews(userName, newsId, newsItemId, { title, description });

        res.status(200).json({
            success: true,
            message: "News updated successfully",
            data: updatedNews
        });
    } catch (error) {
        next(error);
    }
};

export const deleteManualNewsController = async (req, res, next) => {
    try {
        const { newsId, newsItemId } = req.params;
        const { userName } = req.query; // Assuming you'll send userName as a query parameter

        await deleteManualNews(userName, newsId, newsItemId);

        res.status(200).json({
            success: true,
            message: "News deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};