import DeviceModel from "../../model/deviceSchema.js";

export const activateDeviceController = async (req, res) => {
  try {
    const { mac, adminId, isNewAdmin, isNewDevice, deviceDoc } = req.deviceInfo;

    if (!mac) {
      return res.status(400).json({ message: "MAC address is required" });
    }

    if (isNewAdmin) {
      // Check if the MAC address already exists
      const existingDevice = await DeviceModel.findOne({ "devices.macAddress": mac });
      if (existingDevice) {
        return res.status(409).json({ message: "Device with this MAC address already exists" });
      }

      // Create a new document for this admin
      const newDeviceDoc = new DeviceModel({
        adminId,
        devices: [{ macAddress: mac }] // isActive defaults to true
      });
      await newDeviceDoc.save();
      return res.status(200).json({ message: "New admin and device added successfully" });
    }

    if (isNewDevice) {
      // Check if the MAC address already exists within this admin's devices
      const existingDevice = deviceDoc.devices.find(device => device.macAddress === mac);
      if (existingDevice) {
        return res.status(409).json({ message: "Device with this MAC address already exists" });
      }

      // Add the new device to the existing document
      deviceDoc.devices.push({ macAddress: mac }); // isActive defaults to true
      await deviceDoc.save();
      return res.status(200).json({ message: "New device added successfully" });
    }

    // If neither new admin nor new device, handle the case as needed
    // return res.status(400).json({ message: "Invalid request" });
  } catch (error) {
    console.error("Device activation controller error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
