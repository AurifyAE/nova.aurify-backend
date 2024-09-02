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


app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware to check for secret key
const checkSecretKey = (req, res, next) => {
  const secretKey = req.headers['x-secret-key'];
  if (secretKey !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
};

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true); // Allow any origin
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
}));


// Apply secret key check to all routes
app.use(checkSecretKey);

//database connecting
mongodb();

// Routes
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

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Perform any necessary cleanup
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Perform any necessary cleanup
});