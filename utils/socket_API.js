import { io } from "../config/socket_io.js";
import { UsersModel } from "../model/usersSchema.js";
import adminModel from "../model/adminSchema.js";
import ChatModel from "../model/chatSchema.js";

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

        socket.on('sendMessage', async ({ sender, receiver, content, room }) => {
            try {
                if (!mongoose.Types.ObjectId.isValid(sender) || !mongoose.Types.ObjectId.isValid(receiver)) {
                    throw new Error('Invalid sender or receiver ID');
                }

                if (!content || typeof content !== 'string' || content.trim() === '') {
                    throw new Error('Invalid message content');
                }

                let chat = await ChatModel.findOne({
                    $or: [
                        { user: sender, 'conversation.sender': receiver },
                        { user: receiver, 'conversation.sender': sender }
                    ]
                });

                if (!chat) {
                    chat = new ChatModel({
                        user: receiver,
                        conversation: []
                    });
                }

                chat.conversation.push({
                    sender,
                    message: content,
                    time: new Date()
                });

                await chat.save();

                io.to(room).emit('message', { sender, receiver, content, time: new Date() });
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
