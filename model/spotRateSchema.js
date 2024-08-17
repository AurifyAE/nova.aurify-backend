import { types } from "joi";
import mongoose from "mongoose";

const SpotRateSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  silverAskSpread: { types: Number },
  silverBidSpread: { types: Number },
  goldAskSpread: { types: Number },
  goldBidSpread: { types: Number },
  commodities: [
    {
      metal: { type: String, required: true },
      purity: { type: Number, required: true },
      unit: { type: Number, required: true },
      weight: { type: String, required: true },
      buyPremium: { type: Number, required: true },
      sellPremium: { type: Number, required: true },
    },
  ],
});

const spotRateModel = new mongoose.model("SpotRate", SpotRateSchema);

export { spotRateModel };
