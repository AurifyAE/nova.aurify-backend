import mongoose from "mongoose";

const PremiumSchema = new mongoose.Schema({
  premium: [
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

const PremiumModel = mongoose.model("Premium", PremiumSchema);

export default PremiumModel;