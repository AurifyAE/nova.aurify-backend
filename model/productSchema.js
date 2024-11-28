import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    images: {
      type: [String],
      validate: [(val) => val.length > 0, "At least one image is required"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    weight: {
      type: Number,
      required: [true, "Product weight is required"],
      min: [0, "Weight cannot be negative"],
    },
    purity: {
      type: Number,
      required: [true, "Product purity is required"],
      min: [0, "Purity cannot be negative"],
    },
    stock: {
      type: Boolean,
      enum: [true,false], 
      default: true, 
    },
    tags: {
      type: String,
      default: null, 
    },
    sku: {
      type: String,
      required: [true, "SKU code is required"],
      unique: true, 
      trim: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
