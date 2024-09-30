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
  sellPremium: {
    type: Number,
    required: true,
  },
  sellCharge: {
    type: Number,
    required: true,
  },
  spread: {
    type: Number,
    required: true,
  },
  buyPremium: {
    type: Number,
    required: true,
  },
  buyCharge: {
    type: Number,
    required: true,
  },
});

const CategoryModel = mongoose.model("Category", CategorySchema);
export { CategoryModel };
