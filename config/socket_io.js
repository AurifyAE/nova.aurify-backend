import { Server } from "socket.io";
import { isSecretValid } from "../middleware/validateSecret.js";

export const io = new Server({
  cors: {
    origin: '*',
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

io.use((socket, next) => {
  const secret = socket.handshake.auth.secret || socket.handshake.query.secret;
  if (!secret) {
    return next(new Error("No secret provided"));
  }

  if (isSecretValid(secret)) {
    next();
  } else {
    next(new Error("Invalid secret key"));
  }
});