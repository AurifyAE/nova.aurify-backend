import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subcategory name is required"],
      trim: true,
    },
    mainCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainCategory",
      required: [true, "Main category reference is required"],
    },
    description: {
      type: String,
      trim: true,
      default : null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", 
      default : null
    },
  },
  { timestamps: true }
);

const SubCategory = mongoose.model("SubCategory", subCategorySchema);

export default SubCategory;
