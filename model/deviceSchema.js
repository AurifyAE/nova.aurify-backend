import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema({
  devices: [
    {
      macAddress: { 
        type: String, 
        required: true,
      },
      ipAddress: { 
        type: String, 
        required: true 
      },
      isActive: { 
        type: Boolean, 
        default: true 
      },
      lastActiveAt: { 
        type: Date, 
        default: Date.now 
      }
    }
  ],
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true // This will automatically manage createdAt and updatedAt
});

// Compound index to ensure uniqueness of macAddress within each document
deviceSchema.index({ adminId: 1, "devices.macAddress": 1 }, { unique: true });

const DeviceModel = mongoose.model("Device", deviceSchema);

export default DeviceModel;