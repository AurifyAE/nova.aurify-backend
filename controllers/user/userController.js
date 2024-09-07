import {
  userCollectionSave,
  updateUserPassword,
  userUpdateSpread,
  userVerfication,
  requestPassInAdmin,
  getSportrate,
  getNewsByAdminId,
} from "../../helper/user/userHelper.js";
import adminModel from "../../model/adminSchema.js";
import { serverModel } from "../../model/serverSchema.js";

export const registerUser = async (req, res, next) => {
  try {
    const { userName, contact, location, email, password } = req.body;
    const { adminId } = req.params;
    const data = {
      userName,
      contact,
      location,
      email,
      password,
    };

    const response = await userCollectionSave(data, adminId);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};

export const userLoginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { adminId } = req.params;
    const response = await userVerfication(adminId, email, password);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { adminId } = req.params;
    const response = await updateUserPassword(adminId, email, password);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};

export const updateSpread = async (req, res, next) => {
  try {
    const { adminId, userId } = req.params;
    const { spread, title } = req.body;
    const response = await userUpdateSpread(adminId, userId, spread, title);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};

export const requestAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { request } = req.body;
    const response = await requestPassInAdmin(adminId, request);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};
export const fetchAdminBankDetails = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const adminData = await adminModel.findById(adminId, "bankDetails");
    if (!adminData) {
      return res.status(204).json({
        success: false,
        message: "Admin not found",
      });
    }
   
    return res.status(200).json({
      success: true,
      commodities: adminData,
      message: "Fetch banking details successfully",
    });
  } catch (error) {
    next(error);
  }
};
export const getSpotrateDetails = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { success, fetchSpotRate } = await getSportrate(adminId);

    if (!success || !fetchSpotRate) {
      return res.status(204).json({
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
      return res.status(204).json({
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
      return res.status(204).json({
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
      return res.status(204).json({
        success: false,
        message: "Admin not found",
      });
    }
    const commoditySymbols = adminData.commodities.map(
      (commodity) => commodity.symbol.toUpperCase()
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
