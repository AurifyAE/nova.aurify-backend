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
        default : 0,
      },
      email: {
        type: String,
        required: true,
        unique: true, // Ensure the email is unique across all users
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

const UsersModel = mongoose.model("Users", UsersSchema);
export { UsersModel };
