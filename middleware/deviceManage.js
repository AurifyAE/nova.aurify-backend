import adminModel from "../model/adminSchema.js";
import DeviceModel from "../model/deviceSchema.js";

export const deviceManagementMiddleware = async (req, res, next) => {
  try {
    const adminId = req.headers["admin-id"];
    if (!adminId) {
      return res.status(400).json({ message: "Admin ID is required" });
    }

    const admin = await adminModel.findById(adminId);
    if (!admin) {
      return res.status(403).json({ message: "Admin not found" });
    }

    const deviceDoc = await DeviceModel.findOne({ adminId });
    if (!deviceDoc) {
      req.deviceInfo = { adminId, isNewAdmin: true };
      return next();
    }

    const activeScreens = deviceDoc.devices.filter((d) => d.isActive).length;

    // Check if the number of active screens is greater than or equal to the limit
    if (activeScreens > admin.screenLimit) {
      return res.status(403).json({
        message: `Screen limit exceeded. You are allowed a maximum of ${admin.screenLimit} active screen(s). Currently, there are ${activeScreens} active screen(s).`,
      });
    }

    req.deviceInfo = { adminId, deviceDoc };
    next();
  } catch (error) {
    console.error("Middleware error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
