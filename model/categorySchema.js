import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  commodities: {
    type: [String],
    enum: ["Gold", "Silver", "Copper", "Platinum"],
    required: true,
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: "At least one commodity must be selected",
    },
  },
});

const CategoryModel = mongoose.model("Category", CategorySchema);
export { CategoryModel };
