import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const TransactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        unique: true,
        default: () => {
          const now = new Date();
          const timestamp = now.toISOString()
            .replace(/[-:T.Z]/g, '')  // Remove separators
            .substring(2, 14);        // Take YYMMDDHHmmss
          const random = uuidv4().substring(0, 8);
          return `TX${timestamp}${random}`.toUpperCase();
        }
      },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users.users",
    required: true,
  },
  type: {
    type: String,
    enum: ["CREDIT", "DEBIT"],
    required: true,
  },
  method: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceType: {
    type: String,
    enum: ["CASH", "GOLD"],
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const TransactionModel = mongoose.model("Transaction", TransactionSchema);

export { TransactionModel };
