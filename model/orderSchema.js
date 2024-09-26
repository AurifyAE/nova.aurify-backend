import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const orderSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
    unique: true,
  },
  items: [orderItemSchema],
  totalPrice: {
    type: Number,
    required: true,
  },
  transactionId: {
    type: String, // Payment transaction ID if applicable
  },
  orderStatus: {
    type: String,
    default: "processing",
  },
  paymentStatus: {
    type: String,
    default: "pending",
  },
  orderDate: {
    type: Date,
    default: Date.now(),
  },
},{ timestamps: true });

export const orderModel = mongoose.model("Order", orderSchema);
