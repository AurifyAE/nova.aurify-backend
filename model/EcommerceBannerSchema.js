import mongoose from "mongoose";

const EcommerceBannerSchema = new mongoose.Schema(
  {
    banner: [
      {
        title: { type: String, required: true },
        images: [
          {
            imageUrl: { type: String, required: true },
            key: { type: String, required: true },
          },
        ],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

const EcommerceBannerModel = mongoose.model(
  "EcommerceBanner",
  EcommerceBannerSchema
);

export { EcommerceBannerModel };
