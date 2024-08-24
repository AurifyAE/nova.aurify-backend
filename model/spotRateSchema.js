import mongoose from "mongoose";

const SpotRateSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  silverAskSpread: { type: Number, default: 0 },
  silverBidSpread: { type: Number, default: 0 },
  goldAskSpread: { type: Number, default: 0 },
  goldBidSpread: { type: Number, default: 0 },
  copperAskSpread: { type: Number, default: 0 },
  copperBidSpread: { type: Number, default: 0 },
  platinumAskSpread: { type: Number, default: 0 },
  platinumBidSpread: { type: Number, default: 0 },
  goldLowMargin: { type: Number, default: 0 },
  goldHighMargin: { type: Number, default: 0 },
  silverLowMargin: { type: Number, default: 0 },
  silverHighMargin: { type: Number, default: 0 },
  copperLowMargin: { type: Number, default: 0 },
  copperHighMargin: { type: Number, default: 0 },
  platinumLowMargin: { type: Number, default: 0 },
  platinumHighMargin: { type: Number, default: 0 },
  commodities: [
    {
      metal: { type: String },
      purity: { type: Number, default: 0 },
      unit: { type: Number, default: 0 },
      weight: { type: String },
      buyPremium: { type: Number, default: 0 },
      sellPremium: { type: Number, default: 0 },
    },
  ],
});

const spotRateModel = mongoose.model("SpotRate", SpotRateSchema);

export { spotRateModel };
