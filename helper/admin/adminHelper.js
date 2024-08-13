import adminModel from "../../model/adminSchema.js";

export const userVerfication = async (email) => {
  try {
    return await adminModel.findOne({ email });
  } catch (error) {
    throw new Error("Verification failed");
  }
};
