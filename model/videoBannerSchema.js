import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema({
  key: { type: String, required: true }, // S3 key for the video file
  location: { type: String, required: true }, // URL for accessing the video file
});

const BannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videos: [VideoSchema], // Array of video details for each banner
});

const VideoBannerSchema = new mongoose.Schema(
  {
    banner: [BannerSchema], // Array of banners, each with a title and associated videos
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

const VideoBannerModel = mongoose.model("VideoBanner", VideoBannerSchema);

export { VideoBannerModel };
