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

io.on("connection", (socket) =>{
  console.log(`User Connected ${socket.id}`);

  socket.on('send_message', (data) => {
    io.emit('receive_message', data); 
  });

  socket.on("disconnect", () =>{
    console.log('User disconnected',socket.id);
  })
})


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