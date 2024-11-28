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
      enum: [true,false], // Stock status can either be 'active' or 'inactive'
      default: true, // Default to 'active'
    },
    tags: {
      type: String,
      default: "New Arrival", // Default tag for the product
    },
    sku: {
      type: String,
      required: [true, "SKU code is required"],
      unique: true, // Ensure SKU is unique for each product
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
