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
    default:0
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
      default: 0
    },
    pricingOption: {
      type: String,
      enum: ["Discount", "Premium", null], // Ensures only valid values are used
      default: null
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    premiumAmount: {
      type: Number,
      default: 0,
    },
    transactionId: {
      type: String,
      unique: true,
      default: () => {
        const timestamp = Date.now().toString(36);
        const shortUuid = uuidv4().replace(/-/g, '').substring(0, 8);
        return `TX${timestamp}${shortUuid}`.toUpperCase();
      }
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
      required: true
    },
    deliveryDate: {
      type: Date,
      required: true,
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

// Pre-save hook to ensure discount and premium are not applied together
orderSchema.pre("save", function (next) {
  if (this.pricingOption === "Discount") {
    this.premiumAmount = 0;
  } else if (this.pricingOption === "Premium") {
    this.discountAmount = 0;
  }
  next();
});

export const orderModel = mongoose.model("Order", orderSchema);
