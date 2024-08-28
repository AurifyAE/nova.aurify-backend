import DeviceModel from "../../model/deviceSchema.js";

export const activateDeviceController = async (req, res) => {
  try {
    const { mac, adminId, isNewAdmin, isNewDevice, deviceDoc } = req.deviceInfo;
    console.log(mac, adminId, isNewAdmin);

    if (!mac) {
      return res.status(400).json({ message: "MAC address is required" });
    }

    // Check if the MAC address already exists
    const existingDevice = await DeviceModel.findOne({ "devices.macAddress": mac });

    if (existingDevice) {
      return res.status(409).json({ message: "Device with this MAC address already exists" });
    }

    if (isNewAdmin || !deviceDoc) {
      // Create a new document for this admin
      const newDeviceDoc = new DeviceModel({
        adminId,
        devices: [{ macAddress: mac }]
      });
      await newDeviceDoc.save();
      return res.status(200).json({ message: "New device added successfully" });
    }

    // Add the new device to the existing document
    deviceDoc.devices.push({ macAddress: mac });
    await deviceDoc.save();
    return res.status(200).json({ message: "New device added successfully" });

  } catch (error) {
    console.error("Device activation controller error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};