import mongoose from "mongoose";

const ProductDetailSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    markingCharge: {
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

const UserSpotRateSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users.users",
    required: true,
  },
  products: [ProductDetailSchema],

  isActive: {
    type: Boolean,
    default: true,
  },
  
}
);

const UserSpotRateModel = mongoose.model("UserSpotRate", UserSpotRateSchema);

export { UserSpotRateModel };
