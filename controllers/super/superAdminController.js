import { userCollectionSave } from "../../helper/superAdmin/superHelper.js";

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
      features: req.body.features,
      workCompletionDate: req.body.workCompletionDate,
      serviceStartDate: req.body.serviceStartDate,
    };
    await userCollectionSave(userData);
    res.json({ message: "User registered successfully" }).status(201);
  } catch (error) {
    next(error); // Pass the error to the global error handler
  }
};


