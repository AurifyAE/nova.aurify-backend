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


    const chat = await ChatModel.findOne({
      $or: [
        { user: userId, 'conversation.sender': adminId },
        { user: adminId, 'conversation.sender': userId }
      ]
    });

    if (!chat) {
      return res.json({ success: true, chat: null });
    }

    res.json({ success: true, chat });
  } catch (error) {
    console.error('Error fetching chat:', error);
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

  export const markAsRead = async (req, res) => {
    const { userId, adminId } = req.body;
  
    try {
      const result = await ChatModel.updateMany(
        { user: adminId, "conversation.sender": userId },
        { $set: { "conversation.$[elem].read": true } },
        { 
          arrayFilters: [{ "elem.sender": userId, "elem.read": false }],
          multi: true
        }
      );
  
      res.json({ success: true, updatedCount: result.modifiedCount });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };