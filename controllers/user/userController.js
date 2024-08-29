import { userCollectionSave, userUpdateSpread, userVerfication } from "../../helper/user/userHelper.js";

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
      const { spread,title } = req.body;
      const response = await userUpdateSpread(adminId, userId, spread,title);
      res
        .status(200)
        .json({ message: response.message, success: response.success });
    } catch (error) {
      next(error);
    }
  };