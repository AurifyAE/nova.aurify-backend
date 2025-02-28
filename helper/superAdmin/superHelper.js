import adminModel from "../../model/adminSchema.js";
import bcrypt from "bcrypt";
import { decryptPassword, encryptPassword } from "../../utils/crypto.js";
import { deleteS3File, deleteMultipleS3Files } from "../../utils/s3Utils.js";

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
      awsS3Key,
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
    const existingAdminByEmail = await adminModel.findOne({ email });
    if (existingAdminByEmail) {
      return {
        success: false,
        message:
          "The email provided is already in use. Please use a different email.",
      };
    }

    // Check if the username already exists
    const existingAdminByUsername = await adminModel.findOne({ userName });
    if (existingAdminByUsername) {
      return {
        success: false,
        message:
          "The username provided is already in use. Please choose a different username.",
      };
    }

    // Rest of your code remains the same...
    const serviceStartDateObj = new Date(serviceStartDate);
    const serviceEndDate = new Date(serviceStartDateObj);
    serviceEndDate.setDate(serviceEndDate.getDate() + 365);

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
      enabled: true, // Added the enabled field as per schema
    }));

    const { iv, encryptedData } = encryptPassword(password);
    const authCollection = new adminModel({
      userName,
      companyName,
      logo,
      awsS3Key,
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
      serviceEndDate,
    });

    await authCollection.save();
    return { success: true, message: "User registered successfully" };
  } catch (error) {
    // Check if it's a duplicate key error that wasn't caught by our initial checks
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];

      return {
        success: false,
        message: `The ${duplicateField} "${duplicateValue}" is already in use. Please choose a different ${duplicateField}.`,
      };
    }

    throw new Error(`Error saving admin data: ${error.message}`);
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
export const deleteAdminData = async (adminId) => {
  try {
    const adminToDelete = await adminModel.findById(adminId);

    if (!adminToDelete) {
      return {
        success: false,
        status: 404,
        message: "Admin not found",
      };
    }

    // Handle admin logo deletion
    if (adminToDelete.awsS3Key) {
      try {
        await deleteS3File(adminToDelete.awsS3Key);
      } catch (s3Error) {
        return {
          success: false,
          status: 500,
          message: "Failed to delete admin logo",
          error: s3Error.message,
        };
      }
    }

    // Handle bank logos deletion
    if (adminToDelete.bankDetails?.length > 0) {
      const bankLogoKeys = adminToDelete.bankDetails
        .filter((bank) => bank.awsS3Key)
        .map((bank) => bank.awsS3Key);

      if (bankLogoKeys.length > 0) {
        try {
          await deleteMultipleS3Files(bankLogoKeys);
        } catch (s3Error) {
          return {
            success: false,
            status: 500,
            message: "Failed to delete bank logos",
            error: s3Error.message,
          };
        }
      }
    }

    // Delete admin record
    try {
      await adminModel.findByIdAndDelete(adminId);
    } catch (dbError) {
      return {
        success: false,
        status: 500,
        message: "Failed to delete admin record",
        error: dbError.message,
      };
    }

    return {
      success: true,
      status: 200,
      message: "Admin deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      message: "Error in admin deletion process",
      error: error.message,
    };
  }
};

export const collectionUpdate = async (adminId, userData) => {
  try {
    // First get the existing admin document
    const existingAdmin = await adminModel.findById(adminId);
    if (!existingAdmin) {
      throw new Error("Admin not found");
    }

    const updateData = {};

    // Handle logo update separately to manage S3 file deletion
    if (userData.logo !== undefined) {
      // If there's a new logo, delete the old one
      if (
        existingAdmin.awsS3Key &&
        userData.awsS3Key &&
        existingAdmin.awsS3Key !== userData.awsS3Key
      ) {
        await deleteS3File(existingAdmin.awsS3Key);
        console.log(`Previous logo deleted: ${existingAdmin.awsS3Key}`);
      }

      updateData.logo = userData.logo;
      updateData.awsS3Key = userData.awsS3Key;
    }

    // Handle regular fields
    for (const key in userData) {
      if (
        userData[key] !== undefined &&
        ![
          "solutions",
          "features",
          "commodities",
          "password",
          "logo",
          "awsS3Key",
        ].includes(key)
      ) {
        updateData[key] = userData[key];
      }
    }

    // Handle password separately
    if (userData.password) {
      // Assuming you're using encryptPassword in your actual application
      const { iv, encryptedData } = encryptPassword(userData.password);
      updateData.password = encryptedData;
      updateData.passwordAccessKey = iv;
    }

    // Handle array fields with granular updates
    // Solutions
    if (userData.solutions && Array.isArray(userData.solutions)) {
      // Check if we're receiving complete solution objects or just updates
      if (
        userData.solutions.length > 0 &&
        typeof userData.solutions[0] === "object"
      ) {
        // Complete solution objects
        updateData.solutions = userData.solutions.map((solution) => ({
          type: solution.type,
          enabled: solution.enabled !== undefined ? solution.enabled : true,
        }));
      } else {
        // Receiving only solution types - preserve enabled status from existing ones
        const existingSolutions = existingAdmin.solutions.reduce(
          (acc, solution) => {
            acc[solution.type] = solution.enabled;
            return acc;
          },
          {}
        );

        updateData.solutions = userData.solutions.map((solutionType) => ({
          type: solutionType,
          enabled:
            existingSolutions[solutionType] !== undefined
              ? existingSolutions[solutionType]
              : true,
        }));
      }
    }

    // Features
    if (userData.features && Array.isArray(userData.features)) {
      if (
        userData.features.length > 0 &&
        typeof userData.features[0] === "object"
      ) {
        // Complete feature objects
        updateData.features = userData.features.map((feature) => ({
          name: feature.name,
          enabled: feature.enabled !== undefined ? feature.enabled : true,
        }));
      } else {
        // Receiving only feature names - preserve enabled status from existing ones
        const existingFeatures = existingAdmin.features.reduce(
          (acc, feature) => {
            acc[feature.name] = feature.enabled;
            return acc;
          },
          {}
        );

        updateData.features = userData.features.map((featureName) => ({
          name: featureName,
          enabled:
            existingFeatures[featureName] !== undefined
              ? existingFeatures[featureName]
              : true,
        }));
      }
    }

    // Commodities
    if (userData.commodities && Array.isArray(userData.commodities)) {
      if (
        userData.commodities.length > 0 &&
        typeof userData.commodities[0] === "object"
      ) {
        // Complete commodity objects
        updateData.commodities = userData.commodities.map((commodity) => ({
          symbol: commodity.symbol,
          enabled: commodity.enabled !== undefined ? commodity.enabled : true,
        }));
      } else {
        // Receiving only commodity symbols - preserve enabled status from existing ones
        const existingCommodities = existingAdmin.commodities.reduce(
          (acc, commodity) => {
            acc[commodity.symbol] = commodity.enabled;
            return acc;
          },
          {}
        );

        updateData.commodities = userData.commodities.map(
          (commoditySymbol) => ({
            symbol: commoditySymbol,
            enabled:
              existingCommodities[commoditySymbol] !== undefined
                ? existingCommodities[commoditySymbol]
                : true,
          })
        );
      }
    }

    // Use $set to update only the provided fields
    const updatedAdmin = await adminModel.findByIdAndUpdate(
      adminId,
      { $set: updateData },
      { new: true } // Return the updated document
    );

    return updatedAdmin;
  } catch (error) {
    throw new Error(`Error updating admin data: ${error.message}`);
  }
};
