import mongoose from "mongoose";

const screenSlidersSchema = new mongoose.Schema(
    {
      sliders: [
        {
          sliderName: { type: String, required: true },
          timeout: { type: Number, required: true, min: 1, max: 300 }, // Timeout between 1 and 300 seconds
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

const ScreenSliders = mongoose.model("ScreenSliders", screenSlidersSchema);
export default ScreenSliders;
