
import mongoose from 'mongoose';
import ChatModel from '../../model/chatSchema.js';

export const getMessages = async (req, res) => {
    try {
      const { adminId, userId } = req.params;
  
      // Validate that adminId and userId are valid ObjectIds
      if (!mongoose.Types.ObjectId.isValid(adminId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid adminId or userId' });
      }
  
      // Fetch messages where sender is admin and receiver is user, or vice versa
      const messages = await ChatModel.find({
        $or: [
          { sender: adminId, receiver: userId },
          { sender: userId, receiver: adminId }
        ]
      }).sort({ timestamp: 1 }); // Sort messages by timestamp in ascending order
  
      res.json({ success: true, messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  

  export const storeMessage = async (req, res) => {
    try {
      const { sender, receiver, content } = req.body;
  
      // Validate that sender and receiver are valid ObjectIds
      if (!mongoose.Types.ObjectId.isValid(sender) || !mongoose.Types.ObjectId.isValid(receiver)) {
        return res.status(400).json({ success: false, message: 'Invalid sender or receiver ID' });
      }
  
      // Create a new message document
      const newMessage = new ChatModel({
        sender,
        receiver,
        content,
        timestamp: new Date()
      });
  
      // Save the message to the database
      await newMessage.save();
  
      res.status(201).json({ success: true, message: 'Message stored successfully', data: newMessage });
    } catch (error) {
      console.error('Error storing message:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };