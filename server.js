import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import adminRouter from './router/admin/adminRouter.js'
import superRouter from './router/super/superRouter.js'
import deviceRouter from './router/device/deviceRouter.js'
import userRouter from './router/user/userRouter.js'
import { mongodb } from "./config/connaction.js";
import { errorHandler } from "./utils/errorHandler.js";
import { UsersModel } from "./model/usersSchema.js";
import adminModel from "./model/adminSchema.js";
import ChatModel from "./model/chatSchema.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4444;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173","http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('New client connected');

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

  socket.on('sendMessage', async ({ senderId, receiverId, content }) => {
    const message = new ChatModel({
      sender: senderId,
      receiver: receiverId,
      content,
    });
    await message.save();

    // Find receiver's socket ID
    let receiverSocket;
    const admin = await adminModel.findById(receiverId);
    if (admin) {
      receiverSocket = admin.socketId;
    } else {
      const user = await UsersModel.findOne({ 'users._id': receiverId });
      receiverSocket = user.users.find(u => u._id.toString() === receiverId).socketId;
    }

    if (receiverSocket) {
      io.to(receiverSocket).emit('newMessage', message);
    }
  });

  socket.on('disconnect', async () => {
    await adminModel.findOneAndUpdate({ socketId: socket.id }, { $unset: { socketId: 1 } });
    await UsersModel.findOneAndUpdate(
      { 'users.socketId': socket.id },
      { $unset: { 'users.$.socketId': 1 } }
    );
    console.log('Client disconnected');
  });
});



app.use(express.static('public'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(morgan('dev'))
//cors connecting
app.use(
  cors({
    origin: ["http://localhost:5173","http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);


//database connecting
mongodb();

app.use("/api", adminRouter);
app.use("/admin", superRouter);
app.use("/device", deviceRouter);
app.use("/user", userRouter);

// Global error handling middleware
app.use(errorHandler);


server.listen(port, () => {
  console.log("server running !!!!!");
  console.log(`http://localhost:${port}`);
});