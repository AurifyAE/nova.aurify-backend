import {
  userCollectionSave,
  fetchAdminData,
  collectionUpdate,
  fetchAdminDevice,
  fetchDeviceDetails,
  deviceStatusChange,
  deleteDeviceMacAddress,
} from "../../helper/superAdmin/superHelper.js";

export const registerAdmin = async (req, res, next) => {
  try {
    const userData = {
      userName: req.body.userName,
      companyName: req.body.companyName,
      logo: req.file ? req.file.location : undefined,
      address: req.body.address,
      email: req.body.email,
      password: req.body.password,
      contact: req.body.contact,
      whatsapp: req.body.whatsapp,
      userType: req.body.userType,
      solutions: req.body.solutions,
      screenCount: req.body.screenCount ? +req.body.screenCount : 0,
      features: req.body.additionalFeatures,
      commodities: req.body.commodities,
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

    await collectionUpdate(adminId, userData);
  } catch (error) {
    next(error);
  }
};

export const fetchDeviceAdmin = async (req, res, next) => {
  try {
    const infoAdmin = await fetchAdminDevice();
    res.json({ info: infoAdmin }).status(201);
  } catch (error) {
    next(error);
  }
};

export const fetchDevice = async (req, res, next) => {
  try {
    const infoDevice = await fetchDeviceDetails();
    res.json({ info: infoDevice }).status(201);
  } catch (error) {
    next(error);
  }
};

export const changeDeviceStatus = async (req, res, next) => {
  try {
    const { adminId, id } = req.query;
    const { success, message } = deviceStatusChange(adminId, id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message,
      });
    }
    return res.status(200).json({
      success: true,
      message: message,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDevice = async (req, res, next) => {
  try {
    const { adminId, id } = req.query;
    const { success, message } = deleteDeviceMacAddress(adminId, id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message,
      });
    }
    return res.status(200).json({
      success: true,
      message: message,
    });
  } catch (error) {
    next(error);
  }
};
