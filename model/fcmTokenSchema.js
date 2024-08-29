import mongoose from "mongoose";

const FCMTokenSchema = new mongoose.Schema({
    FCMTokens: [
    {
      token: { type: String},
    },
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
});

const FCMTokenModel = mongoose.model("FCMToken", FCMTokenSchema);
export default FCMTokenModel;
