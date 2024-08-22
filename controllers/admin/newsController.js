// controllers/Admin/newsController.js
import {
    addManualNews,
    getManualNews,
    updateManualNews,
    deleteManualNews
} from "../../helper/admin/newsHelper.js";
import { createAppError } from "../../utils/errorHandler.js";


export const addManualNewsController = async (req, res, next) => {
    try {
        const { email, title, description } = req.body;

        if (!email || !title || !description) {
            throw createAppError("Email, title, and description are required.", 400);
        }

        const newNews = await addManualNews(email, title, description);

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
        const email = req.query.email;
        const news = await getManualNews(email);

        res.status(200).json({
            success: true,
            data: news
        });
    } catch (error) {
        next(error);
    }
};

// controllers/Admin/newsController.js

export const updateManualNewsController = async (req, res, next) => {
    try {
        const { newsId, newsItemId } = req.params;
        const { email, title, description } = req.body;

        const updatedNews = await updateManualNews(email, newsId, newsItemId, { title, description });

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
        const { email } = req.query; // Assuming you'll send email as a query parameter

        await deleteManualNews(email, newsId, newsItemId);

        res.status(200).json({
            success: true,
            message: "News deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};