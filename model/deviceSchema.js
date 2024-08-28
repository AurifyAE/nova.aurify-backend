import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema({
  devices: [
    {
      macAddress: { type: String, required: true, unique: true },
      ipAddress: { type: String, required: true },
      isActive: { type: Boolean, default: true }, // Indicates if the device is currently active
    },
  ],
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const DeviceModel = mongoose.model("Device", deviceSchema);

export default DeviceModel;
