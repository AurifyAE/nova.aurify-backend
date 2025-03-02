import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true,default:null },
  goldAskSpread: { type: Number, default: 0 },
  goldBidSpread: { type: Number, default: 0 },
  goldLowMargin: { type: Number, default: 0 },
  goldHighMargin: { type: Number, default: 0 },
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