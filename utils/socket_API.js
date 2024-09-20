import { io } from "../config/socket_io.js";
import { UsersModel } from "../model/usersSchema.js";
import adminModel from "../model/adminSchema.js";
import ChatModel from "../model/chatSchema.js";
import mongoose from "mongoose";

export default function socketApi() {
    io.on('connection', (socket) => {
        socket.on('login', async ({ userId, userType }) => {
            if (userType === 'admin') {
                await adminModel.findByIdAndUpdate(userId, { socketId: socket.id });
            } else {
                await UsersModel.findOneAndUpdate(
                    { 'users._id': userId },
                    { $set: { 'users.$.socketId': socket.id } }
                );
            }
        });

        socket.on('joinRoom', (room) => {
            socket.join(room);
        });

        socket.on('leaveRoom', (room) => {
            socket.leave(room);
        });

        socket.on('sendMessage', async ({ sender, receiver, message, room }) => {
            try {
                if (!mongoose.Types.ObjectId.isValid(sender) || !mongoose.Types.ObjectId.isValid(receiver)) {
                    throw new Error('Invalid sender or receiver ID');
                }
        
                if (!message || typeof message !== 'string' || message.trim() === '') {
                    throw new Error('Invalid message');
                }
        
                // Find the existing chat document
                let chat = await ChatModel.findOne({
                    $or: [
                        { user: receiver, 'conversation.sender': sender },
                        { user: sender, 'conversation.sender': receiver }
                    ]
                });
        
                if (!chat) {
                    // If chat doesn't exist, create a new one
                    chat = new ChatModel({
                        user: receiver,
                        conversation: [{
                            sender,
                            message: message,
                            time: new Date(),
                            read: false
                        }]
                    });
                } else {
                    // If chat exists, add the new message to the conversation
                    chat.conversation.push({
                        sender,
                        message: message,
                        time: new Date(),
                        read: false
                    });
                }
        
                // Save the chat document
                await chat.save();
                
                io.to(room).emit('message', { sender, receiver, message, time: new Date(), read: false });
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: error.message || 'Failed to send message' });
            }
        });

        socket.on('disconnect', async () => {
            await adminModel.findOneAndUpdate({ socketId: socket.id }, { $unset: { socketId: 1 } });
            await UsersModel.findOneAndUpdate(
                { 'users.socketId': socket.id },
                { $unset: { 'users.$.socketId': 1 } }
            );
        });
    });
}