// model/spreadValueSchema.js
import mongoose from "mongoose";

const SpreadValueSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true,
    },
    spreadValues: [Number],
});

const SpreadValueModel = mongoose.model("SpreadValue", SpreadValueSchema);
export { SpreadValueModel };