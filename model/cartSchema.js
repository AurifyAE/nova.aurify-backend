import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users.users",
    required: true,
  },
  totalWeight: { type: Number, default: 0 },
  items: [cartItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Cart = mongoose.model("Cart", cartSchema);
