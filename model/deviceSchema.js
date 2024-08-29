import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    devices: [
      {
        macAddress: {
          type: String,
          default: null,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
);

// Add a sparse unique index on macAddress
deviceSchema.index({ "devices.macAddress": 1 }, { unique: true, sparse: true });

const DeviceModel = mongoose.model("Device", deviceSchema);

export default DeviceModel;