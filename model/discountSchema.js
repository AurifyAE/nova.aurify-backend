import mongoose from "mongoose";

const DiscountSchema = new mongoose.Schema({
  discount: [
    {
      timestamp: { type: Number, required: true, default: Date.now },
      value: { type: Number, required: true },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
});

const DiscountModel = mongoose.model("Discount", DiscountSchema);

export default DiscountModel;