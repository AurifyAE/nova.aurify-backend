import { uploadSingle } from '../../middleware/multer.js';
import Media from '../../model/previewSchema.js';
import mongoose from 'mongoose';

export const uploadBG = async (req, res) => {
  
    const upload = uploadSingle('image', true); // Use local storage
  
    try {
      await new Promise((resolve, reject) => {
        upload(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
  
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
  
      // Validate userID (assuming it should be a non-empty string)
      const userID = req.params.userID;
      if (!userID || typeof userID !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }
  
      // Check if the user already has a media entry
      let existingMedia = await Media.findOne({ createdBy: userID });
  
      if (existingMedia) {
        // Update existing media
        existingMedia.filename = req.file.filename;
        await existingMedia.save();
  
        res.status(200).json({
          success: true,
          message: 'File updated successfully',
          filename: req.file.filename,
          fileUrl: `/uploads/${req.file.filename}`
        });
      } else {
        // Create a new Media document
        const newMedia = new Media({
          filename: req.file.filename,
          createdBy: userID
        });
  
        // Save the new media document
        await newMedia.save();
  
        res.status(201).json({
          success: true,
          message: 'File uploaded successfully',
          filename: req.file.filename,
          fileUrl: `/uploads/${req.file.filename}`
        });
      }
  
    } catch (error) {
      console.error('Error in file upload/update:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error uploading/updating file', 
        error: error.message 
      });
    }
  };
export const getBackground = async (req, res, next) => {
    try {
      const { userId } = req.params;  // Extract userId from params
  
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
  
      // Ensure the userId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid User ID format" });
      }
  
      const backgroundImage = await Media.findOne({ createdBy: userId });
  
      if (backgroundImage) {
        // Assuming you have a base URL for your media files
        const baseUrl = process.env.MEDIA_BASE_URL || `http://localhost:8000/uploads/`;
        const fullImageUrl = `${baseUrl}${backgroundImage.filename}`;
  
        res.json({
          success: true,
          data: {
            filename: backgroundImage.filename,
            url: fullImageUrl
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: "No background image found for this user"
        });
      }
    } catch (error) {
      console.error("Error in getBackground:", error);
      next(error);  // Pass the error to the global error handler
    }
  };