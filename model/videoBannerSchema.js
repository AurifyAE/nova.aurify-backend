import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema({
  key: { type: String, required: true }, 
  location: { type: String, required: true }, 
});

const BannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videos: [VideoSchema], 
});

const VideoBannerSchema = new mongoose.Schema(
  {
    banner: [BannerSchema], 
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true } 
);

const VideoBannerModel = mongoose.model("VideoBanner", VideoBannerSchema);

export { VideoBannerModel };
