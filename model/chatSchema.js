import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const ChatSchema = new Schema({
  user: {
    type: Types.ObjectId,
    ref: "User",
    required: [true, "user id is required"],
  },
  conversation: [
    {
      message: { type: String, required: [true, "message is required"] },
      sender: { type: String, required: [true, "sender is required"] },
      time: { type: Date, default: Date.now }
    },
  ],
});

const ChatModel = mongoose.model("Chat", ChatSchema);
export default ChatModel;