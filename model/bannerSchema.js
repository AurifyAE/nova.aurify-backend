import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema({
  banner: [
    {
      title: { type: String, required: true },
      imageUrl: { type: String, required: true },
    },
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
});

const BannerModel = mongoose.model("Banner", BannerSchema);
export default BannerModel;
