import {
  userCollectionSave,
  fetchAdminData,
  collectionUpdate,
} from "../../helper/superAdmin/superHelper.js";
// import Joi from "joi";
// import { body, validationResult } from "express-validator";

export const registerAdmin = async (req, res, next) => {
  try {
    const userData = {
      userName: req.body.userName,
      logo: req.file ? req.file.filename : undefined,
      address: req.body.address,
      email: req.body.email,
      password: req.body.password,
      contact: req.body.contact,
      whatsapp: req.body.whatsapp,
      userType: req.body.userType,
      solutions: req.body.solutions,
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
    // Validate request body
    const { error, value } = adminUpdateSchema.validate(req.body);
    console.log(value);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { adminId } = req.params;
    console.log(adminId);
    // Sanitize inputs
    sanitizeInputs.forEach((middleware) => middleware(req, res, next));

    console.log(req.body);

    // const userData = {
    //   userName: req.body.userName,
    //   logo: req.file.filename,
    //   address: req.body.address,
    //   email: req.body.email,
    //   password: req.body.password,
    //   contact: req.body.contact,
    //   whatsapp: req.body.whatsapp,
    //   userType: req.body.userType,
    //   solutions: req.body.solutions,
    //   features: req.body.features,
    //   workCompletionDate: req.body.workCompletionDate,
    // };
    // await collectionUpdate(adminId, userData);
  } catch (error) {
    next(error);
  }
};
