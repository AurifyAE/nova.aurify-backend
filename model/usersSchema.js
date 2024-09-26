import mongoose from "mongoose";

const UsersSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  users: [
    {
      userName: {
        type: String,
        required: true,
      },
      contact: {
        type: String,
        required: true,
      },
      location: {
        type: String,
        required: true,
      },
      spread: {
        type: Number,
        default: 0,
      },
      spreadTitle: { type: String, required: true, default: "Rate" },
      email: {
        type: String,
        required: true,
        match: [/.+\@.+\..+/, "Please enter a valid email address"],
      },
      password: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

UsersSchema.index({ createdBy: 1, "users.email": 1 }, { unique: true });
const UsersModel = mongoose.model("Users", UsersSchema);
export { UsersModel };
