import requestIp from "request-ip";
import macaddress from "macaddress";
import adminModel from "../../model/adminSchema.js";
import DeviceModel from "../../model/deviceSchema.js";
// Middleware to manage TV screen access
export const deviceManagementMiddleware = async (req, res, next) => {
  try {
    // Get the device's IP address
    const ip = requestIp.getClientIp(req);

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

    // Count the number of active screens for this admin
    const activeScreens = await DeviceModel.countDocuments({
      adminId,
      isActive: true,
    });

    // Check if the current screen can be added
    if (activeScreens >= adminModel.screenLimit) {
      return res.status(403).json({
        message:
          "Screen limit exceeded. Contact your team to increase the limit.",
      });
    }

    // Check if the device is already registered
    let device = await DeviceModel.findOne({ macAddress: mac, ipAddress: ip });

    if (!device) {
      // If the device is not registered, create a new entry and mark it as active
      device = new DeviceModel({
        macAddress: mac,
        ipAddress: ip,
        isActive: true,
        adminId,
      });
      await device.save();
    }
    res.status(200).json({ message: "Device activated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
