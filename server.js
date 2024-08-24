import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminRouter from './router/admin/adminRouter.js'
import superRouter from './router/super/superRouter.js'
import { mongodb } from "./config/connaction.js";
import { errorHandler } from "./utils/errorHandler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4444;

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



// Global error handling middleware
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log("server running !!!!!");
  console.log(`http://localhost:${port}`);
});