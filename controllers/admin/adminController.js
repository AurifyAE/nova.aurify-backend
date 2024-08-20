import {
  adminVerfication,
  userVerfication,
  userCollectionSave,
  userUpdateSpread,
  updateNotification,
} from "../../helper/Admin/adminHelper.js";
import { createAppError } from "../../utils/errorHandler.js";
import bcrypt from "bcrypt";

export const adminLoginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const authLogin = await adminVerfication(email);

    if (authLogin) {
      const encryptPassword = authLogin.password;
      const matchPassword = await bcrypt.compare(password, encryptPassword);

      if (!matchPassword) {
        throw createAppError("Incorrect password.", 401);
      }

      res.status(200).json({
        success: true,
        message: "Authentication successful.",
      });
    } else {
      throw createAppError("User not found.", 404);
    }
  } catch (error) {
    next(error);
  }
};

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

export const updateSpread = async (req, res, next) => {
  try {
    const { adminId, userId } = req.params;
    const { spread } = req.body;
    const response = await userUpdateSpread(adminId, userId, spread);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { adminId, notificationId } = req.params;
    const response = await updateNotification(adminId, notificationId);
    res
      .status(200)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error);
  }
};
