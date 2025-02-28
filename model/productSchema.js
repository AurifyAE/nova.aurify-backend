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
      default: null,
      required: [true, "Product description is required"],
    },
    images: [
      {
        url: {
          type: String,
          required: [true, "Image URL is required"],
        },
        key: {
          type: String,
          required: [true, "S3 key is required"],
        },
      },
    ],
    price: {
      type: Number,
      default:0,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    weight: {
      type: Number,
      required: [true, "Product weight is required"],
      min: [0, "Weight cannot be negative"],
    },
    makingCharge: {
      type: Number,
      required: [true, "Product makingCharge is required"],
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
    
    type: {
      type: String,
      default: 'GOLD', 
      required:true
    },
    sku: {
      type: String,
      required: [true, "SKU code is required"],
      unique: true, 
      trim: true,
    },
   
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    addedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
