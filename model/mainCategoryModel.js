import mongoose from "mongoose";

const mainCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Main category name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    image: {
      type: String,
      default: null, // you can store an image URL or file path here
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

const MainCategory = mongoose.model("MainCategory", mainCategorySchema);

export default MainCategory;
