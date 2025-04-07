import {
  userCollectionSave,
  fetchAdminData,
  collectionUpdate,
  deleteAdminData,
} from "../../helper/superAdmin/superHelper.js";

export const registerAdmin = async (req, res, next) => {
  try {
    const userData = {
      userName: req.body.userName,
      companyName: req.body.companyName,
      logo: req.file ? req.file.location : undefined,
      awsS3Key: req.file ? req.file.key : undefined,
      address: {
        buildingNameNumber: req.body.address?.buildingNameNumber,
        city: req.body.address?.city,
        country: req.body.address?.country,
        latitude: req.body.address?.latitude,
        longitude: req.body.address?.longitude
      },
      email: req.body.email,
      password: req.body.password,
      contact: req.body.contact,
      whatsapp: req.body.whatsapp,
      socialMedia: req.body.socialMedia || [],
      workCompletionDate: req.body.workCompletionDate,
      serviceStartDate: req.body.serviceStartDate,
    };
    const response = await userCollectionSave(userData);
    res
      .status(201)
      .json({ message: response.message, success: response.success });
  } catch (error) {
    next(error); // Pass the error to the global error handler
  }
};
export const getAdmin = async (req, res, next) => {
  try {
    const infoAdmin = await fetchAdminData();
    res.json({ info: infoAdmin }).status(201);
  } catch (error) {
    next(error);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
      });
    }

    const result = await deleteAdminData(adminId);

    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      ...(result.error && { error: result.error }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process delete request",
      error: error.message,
    });
  }
};
export const editAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const formatDate = (dateString) => {
      if (!dateString) return undefined;
      const date = new Date(dateString);
      date.setDate(date.getDate() - 1); // Subtract one day
      return date.toISOString().split(".")[0] + ".000+00:00";
    };

    // Create the updated data object
    const userData = {
      userName: req.body.userName,
      logo: req.file ? req.file.location : undefined,
      awsS3Key: req.file ? req.file.key : undefined, // Add the S3 key when uploading a new file
      address: req.body.address,
      email: req.body.email,
      password: req.body.password,
      contact: req.body.contact,
      whatsapp: req.body.whatsapp,
      userType: req.body.userType,
      solutions: req.body.solutions,
      features: req.body.features,
      commodities: req.body.commodities,
      workCompletionDate: formatDate(req.body.workCompletionDate),
      serviceStartDate: formatDate(req.body.serviceStartDate),
      serviceEndDate: formatDate(req.body.serviceEndDate),
    };

    const updatedAdmin = await collectionUpdate(adminId, userData);
    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    next(error);
  }
};
