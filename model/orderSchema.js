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
  addedAt: {
    type: Date,
    default: Date.now,
  },
  itemStatus: {
    type: String,
    default: "Approval Pending"
  }
});

const orderSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true
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
    },
    transactionId: {
      type: String,
      unique: true,
      default: () => {
        // Get current timestamp in milliseconds and convert to base 36
        const timestamp = Date.now().toString(36);
        // Take first 8 characters of UUID v4 (without dashes)
        const shortUuid = uuidv4().replace(/-/g, '').substring(0, 8);
        return `TX${timestamp}${shortUuid}`.toUpperCase();
      }
    },
    orderStatus: {
      type: String,
      default: "Processing",
    },
    paymentStatus: {
      type: String,
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    deliveryDate: {
      type: Date,
      default: Date.now,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    instructions: {
      type: String,
      maxlength: 500,
    },
    notificationSentAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

orderSchema.index({ adminId: 1 });

export const orderModel = mongoose.model("Order", orderSchema);