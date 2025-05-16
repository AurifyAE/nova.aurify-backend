import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  fixedPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  productWeight: {
    type: Number,
    required: true,
    default: 0,
  },
  makingCharge: {
    type: Number,
    default: 0,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  itemStatus: {
    type: String,
    default: "Approval Pending",
  },
  select: {
    type: Boolean,
    default: false,
  },
});

const orderSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    items: [orderItemSchema],
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    totalWeight: {
      type: Number,
      required: true,
      default: 0,
    },
    transactionId: {
      type: String,
      unique: true,
      default: () => {
        const timestamp = Date.now().toString(36);
        const shortUuid = uuidv4().replace(/-/g, "").substring(0, 8);
        return `TX${timestamp}${shortUuid}`.toUpperCase();
      },
    },
    orderStatus: {
      type: String,
      default: "Processing",
    },
    orderRemark: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },

    notificationSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const orderModel = mongoose.model("Order", orderSchema);
