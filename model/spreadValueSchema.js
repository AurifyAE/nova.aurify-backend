import mongoose from "mongoose";

const SpreadValueSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true,
    },
    spreadValues: [{
        spreadValue: { type: Number, required: true },
        title: { type: String, required: true, default: "Rate" }
    }],
});

const SpreadValueModel = mongoose.model("SpreadValue", SpreadValueSchema);
export { SpreadValueModel };