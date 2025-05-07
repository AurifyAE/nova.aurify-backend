import mongoose from "mongoose";

const ProductDetailSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    makingCharge: {
      type: Number,
      default: 0,
    },
    pricingType: {
      type: String,
      enum: ["Discount", "Premium"],
      default: null,
    },
    value: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: null,
    },
  },
);

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    products: [ProductDetailSchema],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const CategoryModel = mongoose.model("Category", CategorySchema);

export { CategoryModel };
