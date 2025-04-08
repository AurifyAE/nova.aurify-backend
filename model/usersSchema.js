import mongoose from "mongoose";

const UsersSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  users: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
      contact: { type: Number, required: true },
      address: { type: String, required: true },
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
      userSpotRateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserSpotRate",
        default:null
      },
      password: { type: String, required: true },
      passwordAccessKey: { type: String, required: true },
      cashBalance: { type: Number, default: 0 },
      goldBalance: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

const UsersModel = mongoose.model("Users", UsersSchema);

export { UsersModel };
