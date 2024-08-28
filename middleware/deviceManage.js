import macaddress from "macaddress";
import adminModel from "../model/adminSchema.js";
import DeviceModel from "../model/deviceSchema.js";

export const deviceManagementMiddleware = async (req, res, next) => {
  try {
    // Get the device's MAC address
    const mac = await macaddress.one();
  
    // Extract the admin ID from the request (assumed to be passed in headers or query)
    const adminId = req.headers["admin-id"]; // Or use req.query.adminId

    if (!adminId) {
      return res.status(400).json({ message: "Admin ID is required" });
    }

    // Find the admin associated with the provided admin ID
    const admin = await adminModel.findById(adminId);
    if (!admin) {
      return res.status(403).json({ message: "Admin not found" });
    }

    const deviceDoc = await DeviceModel.findOne({ adminId });
    if (!deviceDoc) {
      req.deviceInfo = { mac, adminId, isNewAdmin: true };
      return next();
    }
    const device = deviceDoc.devices.find((d) => d.macAddress === mac);
    if (!device) {
      // If the device is not in the array, we'll add it in the controller
      req.deviceInfo = { mac, adminId, isNewDevice: true, deviceDoc };
      return next();
    }
    const activeScreens = deviceDoc.devices.filter((d) => d.isActive).length;
    console.log(activeScreens)
    // Check if the current screen can be added (only if it's not already active)
    if (admin.screenLimit < activeScreens) {
      return res.status(403).json({
        message:
          "Screen limit exceeded. Contact your team to increase the limit.",
      });
    }
    req.deviceInfo = { mac, adminId, device, deviceDoc };

    // Proceed to the controller
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
