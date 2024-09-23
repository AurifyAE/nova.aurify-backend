import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { mongodb } from "./config/connaction.js";
import { io } from "./config/socket_io.js";
import adminRouter from "./router/admin/adminRouter.js";
import deviceRouter from "./router/device/deviceRouter.js";
import superRouter from "./router/super/superRouter.js";
import userRouter from "./router/user/userRouter.js";
import { errorHandler } from "./utils/errorHandler.js";
import socketApi from "./utils/socket_API.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4444;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Add your frontend URL to the whitelist
    const whitelist = [
      "http://localhost:3000",
    ];
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with CORS enabled
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(__dirname, "public/uploads"))
);

// Custom middleware to check for secret key
const checkSecretKey = (req, res, next) => {
  const secretKey = req.headers["x-secret-key"];
  if (secretKey !== process.env.API_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
};

// Apply secret key check to API routes
app.use("/api", checkSecretKey, adminRouter);
app.use("/admin", checkSecretKey, superRouter);
app.use("/device", checkSecretKey, deviceRouter);
app.use("/user", checkSecretKey, userRouter);

//database connecting
mongodb();

// Global error handling middleware
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log("server running !!!!!");
  console.log(`http://localhost:${port}`);
});

io.attach(server);
socketApi();
