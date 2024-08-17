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
  goldLowValueMargin: { types: Number },
  goldHighValueMargin: { types: Number },
  silverLowValueMargin: { types: Number },
  silverHighValueMargin: { types: Number },
  commodities: [
    {
      metal: { type: String },
      purity: { type: Number },
      unit: { type: Number },
      weight: { type: String },
      buyPremium: { type: Number },
      sellPremium: { type: Number },
    },
  ],
});

const spotRateModel = new mongoose.model("SpotRate", SpotRateSchema);

export { spotRateModel };
