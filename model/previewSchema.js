import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
});

const Media = mongoose.model('Media', mediaSchema);

export default Media;