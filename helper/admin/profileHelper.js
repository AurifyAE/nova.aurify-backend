import adminModel from '../../model/adminSchema.js';
import { deleteS3File } from '../../utils/s3Utils.js'
export const updateUserData = async (id, email, fullName, mobile, whatsapp, companyName, address, socialMedia) => {
  try {
    const formattedSocialMedia = Array.isArray(socialMedia)
      ? socialMedia.filter(item => item.platform && item.link) // Only include entries with both platform and link
      : [];


    return await adminModel
      .findByIdAndUpdate(
        id,
        {
          email: email,
          userName: fullName,
          contact: mobile,
          whatsapp: whatsapp,
          companyName: companyName,
          address: {
            buildingNameNumber: address.buildingNameNumber || "",
            city: address.city || "",
            country: address.country || "",
            latitude: address.latitude || "",
            longitude: address.longitude || "",
          },
          socialMedia: formattedSocialMedia.map(item => ({
            platform: item.platform,
            link: item.link
          })),
        },
        { new: true, runValidators: true }
      )
      .select("-password");
  } catch (error) {
    console.error("Error in updateing the user:", error.message);
    throw new Error("Updation failed: " + error.message);
  }
};

export const updateUserLogo = async (userName, newLogoName, newAwsS3Key) => {
  try {
    // First, find the admin to get the old S3 key
    const admin = await adminModel.findOne({ userName: userName });

    if (!admin) {
      return {
        success: false,
        status: 404,
        message: "Admin not found"
      };
    }

    // Delete the old logo from S3 if it exists
    if (admin.awsS3Key) {
      try {
        await deleteS3File(admin.awsS3Key);
      } catch (s3Error) {
        return {
          success: false,
          status: 500,
          message: "Failed to delete old logo",
          error: s3Error.message
        };
      }
    }

    // Update with new logo information
    const updatedAdmin = await adminModel.findOneAndUpdate(
      { userName: userName },
      {
        logo: newLogoName,
        awsS3Key: newAwsS3Key
      },
      { new: true }
    );

    if (!updatedAdmin) {
      return {
        success: false,
        status: 404,
        message: "Admin not found during update"
      };
    }

    return {
      success: true,
      status: 200,
      message: "Logo updated successfully",
    };

  } catch (error) {
    return {
      success: false,
      status: 500,
      message: "Logo update failed",
      error: error.message
    };
  }
};
