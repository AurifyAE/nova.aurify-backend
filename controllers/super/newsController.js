import {
    addNews,
    updateNews,
    deleteNews,
    getAllNews,
  } from "../../helper/superAdmin/newsHelper.js"
  

  export const addNewsController = async (req, res) => {
    const { title, description } = req.body;
  
    const result = await addNews({ title, description });
    res.status(result.success ? 201 : 400).json(result);
  };
  
 
  export const updateNewsController = async (req, res) => {
    const { newsId,parentId } = req.params;
    const updateData = req.body;
    const result = await updateNews(newsId,parentId, updateData);
    res.status(result.success ? 200 : 400).json(result);
  };
  
 
  export const deleteNewsController = async (req, res) => {
    const { newsId } = req.params;
  
    const result = await deleteNews(newsId);
    res.status(result.success ? 200 : 400).json(result);
  };
  

  export const getAllNewsController = async (req, res) => {
    const result = await getAllNews();
    res.status(result.success ? 200 : 400).json(result);
  };
  
 

  