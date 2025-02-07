import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    devices: [
      {
        macAddress: {
          type: String,
          default: null,
          unique: true,
          sparse: true 
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


const DeviceModel = mongoose.model("Device", deviceSchema);

export default DeviceModel;