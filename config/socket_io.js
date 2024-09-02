import { Server } from "socket.io";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173","http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});