import macaddress from "macaddress";
import DeviceModel from "../../model/deviceSchema.js";

export const activateDeviceController = async (req, res) => {
  try {
    const mac = await macaddress.one();
    if (!mac) {
      return res.status(400).json({ message: "MAC address is required" });
    }

    const { adminId, isNewAdmin, deviceDoc } = req.deviceInfo;

    const existingDevice = await DeviceModel.findOne({ "devices.macAddress": mac });
    if (existingDevice) {
      return res.status(201).json({ message: "Device with this MAC address already exists" });
    }

    if (isNewAdmin || !deviceDoc) {
      const newDeviceDoc = new DeviceModel({
        adminId,
        devices: [{ macAddress: mac }]
      });
      await newDeviceDoc.save();
      return res.status(201).json({ message: "New device added successfully" });
    }

    // Use atomic update to avoid race conditions
    await DeviceModel.findOneAndUpdate(
      { adminId },
      { $push: { devices: { macAddress: mac } } },
      { new: true }
    );

    return res.status(200).json({ message: "New device added successfully" });
  } catch (error) {
    console.error("Device activation controller error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
