import { userVerfication } from "../../helper/Admin/adminHelper.js";
import { createAppError } from "../../utils/errorHandler.js";
import bcrypt from "bcrypt";

export const userLoginController = async (req, res, next) => { // Include next here
  try {
    const { email, password } = req.body;
    const authLogin = await userVerfication(email);

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
    next(error); // Pass the error to the global error handler
  }
};
