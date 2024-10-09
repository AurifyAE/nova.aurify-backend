import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

const CategoryModel = mongoose.model("Category", CategorySchema);
export { CategoryModel };
