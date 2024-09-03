import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminRouter from './router/admin/adminRouter.js'
import superRouter from './router/super/superRouter.js'
import deviceRouter from './router/device/deviceRouter.js'
import userRouter from './router/user/userRouter.js'
import { mongodb } from "./config/connaction.js";
import { errorHandler } from "./utils/errorHandler.js";
import { io } from "./config/socket_io.js";
import socketApi from "./utils/socket_API.js"

dotenv.config();

const app = express();
const port = process.env.PORT || 4444;



app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware to check for secret key
const checkSecretKey = (req, res, next) => {
  const secretKey = req.headers["x-secret-key"];
  if (secretKey !== process.env.API_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
};

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true); // Allow any origin
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

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


const server = app.listen(port, () => {
  console.log("server running !!!!!");
  console.log(`http://localhost:${port}`);
});


io.attach(server)
socketApi()
