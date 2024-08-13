import mongoose from "mongoose";

const superAdminSchema = new mongoose.Schema({
  email: {
    type: String,
  },
  password: {
    type: String,
  },
});

// Create the user model
const superAdminModel = new mongoose.model("SuperAdmin", superAdminSchema);   
export { superAdminModel };