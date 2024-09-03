import adminModel from '../../model/adminSchema.js';

export const updateUserData = async (id, email, fullName, mobile, location) => {
    try {
      return await adminModel
        .findByIdAndUpdate(
          id,
          {
            email: email,
            userName: fullName,
            contact: mobile,
            address: location,
          },
          { new: true, runValidators: true }
        )
        .select("-password");
    } catch (error) {
      console.error("Error in updateing the user:", error.message);
      throw new Error("Updation failed: " + error.message);
    }
  };
  
  export const updateUserLogo = async (email, logoName) => {
    try {
      return await adminModel.findOneAndUpdate(
        { email: email },
        { logo: logoName },
        { new: true }
      );
    } catch (error) {
      console.error("Error in updating the logo:", error.message);
      throw new Error("Logo Updation failed: " + error.message);
    }
  };
  