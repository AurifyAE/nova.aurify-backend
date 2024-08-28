import DeviceModel from "../../model/deviceSchema.js";

// Controller to handle device activation
export const activateDeviceController = async (req, res) => {
  try {
    const { ip, mac, adminId, isNewAdmin, isNewDevice, deviceDoc } = req.deviceInfo;

    // Double-check that MAC address is not null or undefined
    if (!mac) {
      return res.status(400).json({ message: "Invalid MAC address" });
    }

    if (isNewAdmin) {
      // Create a new document for this admin
      const newDeviceDoc = new DeviceModel({
        adminId,
        devices: [{ macAddress: mac, ipAddress: ip }] // isActive defaults to true
      });
      await newDeviceDoc.save();
      return res.status(200).json({ message: "New admin and device added successfully" });
    }

    if (isNewDevice) {
      // Add the new device to the existing document
      deviceDoc.devices.push({ macAddress: mac, ipAddress: ip }); // isActive defaults to true
      await deviceDoc.save();
      return res.status(200).json({ message: "New device added successfully" });
    }

    // If we reach here, the device already exists, so we just need to ensure it's active and update IP
    const deviceIndex = deviceDoc.devices.findIndex(d => d.macAddress === mac);
    if (deviceIndex !== -1) {
      deviceDoc.devices[deviceIndex].isActive = true; // Ensure it's active
      deviceDoc.devices[deviceIndex].ipAddress = ip; // Update IP address in case it changed
      await deviceDoc.save();
    }

    res.status(200).json({ message: "Device activated successfully" });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate MAC address" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};