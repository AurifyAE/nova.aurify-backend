import { updateUserData, updateUserLogo } from "../../helper/admin/profileHelper.js";

export const updateAdminProfileController = async (req, res, next) => {
    try {
      const { id } = req.params; // Get ID from URL parameters
      const { email, fullName, mobile, location,whatsapp } = req.body; // Get updated data from request body
  
      if (!id) {
        throw createAppError("ID parameter is required.", 400);
      }
  
      const updateAdminData = await updateUserData(
        id,
        email,
        fullName,
        mobile,
        location,
        whatsapp
      );
      // Find the admin by ID and update the fields
  
      if (!updateAdminData) {
        throw createAppError("Admin not found.", 404);
      }
  
      res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        data: updateAdminData,
      });
    } catch (error) {
      console.log("Error updating profile:", error.message);
      next(error); // Pass the error to the global error handler
    }
  };
  
  export const updateLogo = async (req, res) => {
    try {
      const { userName } = req.body;
      const logoName = req.file.location;
  
      // Update the user's logo in the database
      const updatedUser = await updateUserLogo(userName, logoName);
      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
  
      res.json({
        success: true,
        message: "Logo updated successfully",
        data: { logo: logoName },
      });
    } catch (error) {
      console.error("Error updating logo:", error);
      res.status(500).json({ success: false, message: "Error updating logo" });
    }
  };
  