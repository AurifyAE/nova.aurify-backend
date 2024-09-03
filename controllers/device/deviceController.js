import macaddress from "macaddress";
import DeviceModel from "../../model/deviceSchema.js";
import {
  getNewsByAdminId,
  getSportrate,
} from "../../helper/device/deviceHalper.js";
import { serverModel } from "../../model/serverSchema.js";
import adminModel from "../../model/adminSchema.js";

export const activateDeviceController = async (req, res) => {
  try {
    const mac = await macaddress.one();
    if (!mac) {
      return res.status(400).json({ message: "MAC address is required" });
    }

    const { adminId, isNewAdmin, deviceDoc } = req.deviceInfo;

    const existingDevice = await DeviceModel.findOne({
      "devices.macAddress": mac,
    });
    if (existingDevice) {
      return res
        .status(201)
        .json({ message: "Device with this MAC address already exists" });
    }

    if (isNewAdmin || !deviceDoc) {
      const newDeviceDoc = new DeviceModel({
        adminId,
        devices: [{ macAddress: mac }],
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
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const getSpotrateDetails = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { success, fetchSpotRate } = await getSportrate(adminId);

    if (!success || !fetchSpotRate) {
      return res.status(404).json({
        success: false,
        message: "SpotRate data not found",
      });
    }

    return res.status(200).json({
      success: true,
      info: fetchSpotRate,
      message: "Fetching SpotRate successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getServerDetails = async (req, res, next) => {
  try {
    const serverInfo = await serverModel.findOne(
      {},
      "selectedServerName selectedServerURL"
    );

    if (!serverInfo) {
      return res.status(404).json({
        success: false,
        message: "No server information found",
      });
    }

    return res.status(200).json({
      success: true,
      info: {
        serverURL: serverInfo.selectedServerURL,
        serverName: serverInfo.selectedServerName,
      },
      message: "Fetching ServerURL & ServerName successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentNews = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { success, news, message } = await getNewsByAdminId(adminId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(200).json({
      success: true,
      news,
      message: "News fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getCommodities = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const adminData = await adminModel.findById(adminId, "commodities.symbol");
    if (!adminData) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    const commoditySymbols = adminData.commodities.map(
      (commodity) => commodity.symbol
    );
    return res.status(200).json({
      success: true,
      commodities: commoditySymbols,
      message: "Commodities fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};
