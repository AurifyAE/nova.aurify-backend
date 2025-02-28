import {
  updateUserData,
  updateUserLogo,
} from "../../helper/admin/profileHelper.js";

export const updateAdminProfileController = async (req, res, next) => {
  try {
    const { id } = req.params; // Get ID from URL parameters
    const { email, fullName, mobile, location, whatsapp } = req.body; // Get updated data from request body

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

    if (!req.file || !req.file.location) {
      return res.status(400).json({
        success: false,
        message: "Logo file is required",
      });
    }

    const logoName = req.file.location;

    const awsS3Key = req.file.key;

    const result = await updateUserLogo(userName, logoName, awsS3Key);

    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      ...(result.error && { error: result.error }),
    });
  } catch (error) {
    console.error("Error updating logo:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating logo",
      error: error.message,
    });
  }
};
