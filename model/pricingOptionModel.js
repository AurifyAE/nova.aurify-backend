import mongoose from "mongoose";

const pricingOptionSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    methodType: { type: String, enum: ["Cash", "Bank"], required: true }, // Cash or Bank
    pricingType: {
      type: String,
      enum: ["Discount", "Premium"],
      required: true,
    }, // Discount or Premium
    value: { type: Number, required: true }, // Store Discount or Premium amount
    createdAt: { type: Date, default: Date.now }, // Timestamp for stack logic
  },
  { timestamps: true }
);

export const PricingOption = mongoose.model(
  "PricingOption",
  pricingOptionSchema
);
