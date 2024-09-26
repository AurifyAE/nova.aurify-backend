import mongoose from "mongoose";

const FCMTokenSchema = new mongoose.Schema({
  FCMTokens: [
    {
      token: {
        type: String,
        required: true, // Ensure the token is required
      },
    },
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
});

// Create a unique index on the 'FCMTokens.token' field
FCMTokenSchema.index({createdBy: 1,  'FCMTokens.token': 1 }, { unique: true });

const FCMTokenModel = mongoose.model("FCMToken", FCMTokenSchema);
export default FCMTokenModel;