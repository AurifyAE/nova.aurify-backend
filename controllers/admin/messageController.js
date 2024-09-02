import mongoose from 'mongoose';
import ChatModel from '../../model/chatSchema.js';
import { UsersModel } from '../../model/usersSchema.js';
import adminModel from '../../model/adminSchema.js';

export const getMessages = async (req, res) => {
  try {
    const { adminId, userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(adminId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid adminId or userId' });
    }

    let chat = await ChatModel.findOne({
        $or: [
          { user: userId, 'conversation.sender': adminId },
          { user: adminId, 'conversation.sender': userId }
        ]
      });

    if (!chat) {
      chat = new ChatModel({
        user: userId,
        conversation: []
      });
      await chat.save();
    }

    res.json({ success: true, chat });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const storeMessage = async (req, res) => {
  try {
    const { message, sender, time } = req.body;
    const receiverId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(sender) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, message: 'Invalid sender or receiver ID' });
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid message' });
    }

    if (!time || isNaN(new Date(time).getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid time' });
    }

    let chat = await ChatModel.findOne({
        $or: [
          { user: sender, 'conversation.sender': receiverId },
          { user: receiverId, 'conversation.sender': sender }
        ]
      });

    if (!chat) {
      chat = new ChatModel({
        user: receiverId,
        conversation: []
      });
    }

    chat.conversation.push({
      message,
      sender,
      time
    });

    await chat.save();

    res.status(201).json({ success: true, message: 'Message stored successfully', data: chat });
  } catch (error) {
    console.error('Error storing message:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUserAdmin = async (req, res) => {
    try {
      const { userId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid userId' });
      }
  
      const user = await UsersModel.findOne({ 'users._id': userId });
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      const admin = await adminModel.findOne({ _id: user.adminId });
  
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found for this user' });
      }
  
      res.json({ success: true, admin: { _id: admin._id, userName: admin.userName } });
    } catch (error) {
      console.error('Error fetching user admin:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };