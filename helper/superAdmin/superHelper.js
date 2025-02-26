import adminModel from "../../model/adminSchema.js";
import bcrypt from "bcrypt";
import { decryptPassword, encryptPassword } from "../../utils/crypto.js";


// Function to hash the password
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    throw new Error("Error hashing password");
  }
};

export const userCollectionSave = async (userData) => {
  try {
    const {
      userName,
      companyName,
      logo,
      address,
      email,
      password,
      contact,
      whatsapp,
      userType,
      screenCount,
      solutions = [],
      features = [],
      commodities = [],
      workCompletionDate,
      serviceStartDate,
    } = userData;

    // Check if the email already exists
    const existingAdmin = await adminModel.findOne({ email });
    if (existingAdmin) {
      return {
        success: false,
        message:
          "The email provided is already in use. Please use a different email.",
      };
    }

    // Calculate serviceEndDate by adding 365 days to serviceStartDate
    const serviceStartDateObj = new Date(serviceStartDate);
    const serviceEndDate = new Date(serviceStartDateObj);
    serviceEndDate.setDate(serviceEndDate.getDate() + 365);

    // Transform solutions and features into the correct format
    const formattedSolutions = solutions.map((solution) => ({
      type: solution,
      enabled: true,
    }));

    const formattedFeatures = features.map((feature) => ({
      name: feature,
      enabled: true,
    }));

    const formattedCommodities = commodities.map((commodity) => ({
      symbol: commodity,
    }));

    // const encrypt = await hashPassword(password);
    const { iv, encryptedData } = encryptPassword(password);

    const authCollection = new adminModel({
      userName,
      companyName,
      logo,
      address,
      email,
      password: encryptedData,
      passwordAccessKey: iv,
      contact,
      whatsapp,
      userType,
      screenLimit: screenCount,
      solutions: formattedSolutions,
      features: formattedFeatures,
      commodities: formattedCommodities,
      workCompletionDate,
      serviceStartDate: serviceStartDateObj,
      serviceEndDate, // Store the calculated serviceEndDate
    });

    await authCollection.save();
    return { success: true, message: "User registered successfully" };
  } catch (error) {
    throw new Error("Error saving admin data");
  }
};

export const fetchAdminData = async () => {
  try {
    const admins = await adminModel.find({});
    return admins.map((admin) => {
      const decryptedPassword = decryptPassword(
        admin.password,
        admin.passwordAccessKey
      ); // Assuming the `iv` field is stored in the admin schema
      return {
        ...admin.toObject(), // Convert Mongoose document to plain JavaScript object
        password: decryptedPassword, // Replace encrypted password with the decrypted one
      };
    });
  } catch (error) {
    throw new Error("Error fetching admin data");
  }
};

export const collectionUpdate = async (adminId, userData) => {
  try {
    const updateData = {};

    // Iterate over the userData object and conditionally add fields to updateData
    // Process each field dynamically
    for (const key in userData) {
      if (userData[key] !== undefined) {
        // Check if the value is not undefined
        if (key === "password") {
          updateData.password = await hashPassword(userData[key]);
        } else if (
          key === "solutions" ||
          key === "features" ||
          key === "commodities"
        ) {
          // Handle array fields like solutions, features, and commodities
          updateData[key] = userData[key].map((item) => ({
            ...item, // Use spread to copy all properties from item
            enabled: item.enabled !== undefined ? item.enabled : true,
          }));
        } else {
          updateData[key] = userData[key];
        }
      }
    }
    // Use $set to update only the provided fields
    const updatedAdmin = await adminModel.findByIdAndUpdate(
      adminId,
      { $set: updateData },
      { new: true } // Return the updated document
    );

    if (!updatedAdmin) {
      throw new Error("Admin not found");
    }

    return updatedAdmin;
  } catch (error) {
    throw new Error(`Error updating admin data: ${error.message}`);
  }
};

