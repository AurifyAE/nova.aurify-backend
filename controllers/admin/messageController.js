import mongoose from 'mongoose';
import ChatModel from '../../model/chatSchema.js';

export const getMessages = async (req, res) => {
  try {
    const { adminId, userId } = req.params;
    console.log(adminId, userId);

    if (!mongoose.Types.ObjectId.isValid(adminId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid adminId or userId' });
    }

    let chat = await ChatModel.findOne({ user: userId });

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
    console.log(message, sender, time, receiverId);

    if (!mongoose.Types.ObjectId.isValid(sender) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, message: 'Invalid sender or receiver ID' });
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid message' });
    }

    if (!time || isNaN(new Date(time).getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid time' });
    }

    let chat = await ChatModel.findOne({ user: receiverId });

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