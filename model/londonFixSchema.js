import mongoose from "mongoose";

const metalDataSchema = new mongoose.Schema({
  metalType: {
    type: String,
    required: true,
  },
  amPrice: {
    type: Number,
    default: null,
  },
  pmPrice: {
    type: Number,
    default: null,
  },
  noonPrice: {
    type: Number,
    default: null,
  },
});

const londonFixSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    metals: [metalDataSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create a compound index on date and "metals.metalType" to ensure unique metal types per date
londonFixSchema.index({ date: 1, "metals.metalType": 1 }, { unique: true });

const LondonFixModel = mongoose.model("LondonFix", londonFixSchema);

export default LondonFixModel;
