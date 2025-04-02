import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true,default:null },
 
});

const UserSpotRateSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  categories: [CategorySchema],
});

const UserSpotRateModel = mongoose.model("UserSpotRate", UserSpotRateSchema);

export { UserSpotRateModel };