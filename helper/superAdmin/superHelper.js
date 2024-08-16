import adminModel from "../../model/adminSchema.js";
import bcrypt from "bcrypt";

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
      logo,
      address,
      email,
      password,
      contact,
      whatsapp,
      userType,
      solutions,
      features,
      commodities,
      workCompletionDate,
      serviceStartDate,
    } = userData;

    // Calculate serviceEndDate by adding 365 days to serviceStartDate
    const serviceStartDateObj = new Date(serviceStartDate);
    const serviceEndDate = new Date(serviceStartDateObj);
    serviceEndDate.setDate(serviceEndDate.getDate() + 365);

    // Transform solutions and features into the correct format
    const formattedSolutions = solutions.map((solution) => ({
      type: solution,
      enabled: true, // or false, depending on your logic
    }));

    const formattedFeatures = features.map((feature) => ({
      name: feature,
      enabled: true, // or true, depending on your logic
    }));

    const formattedCommodities = commodities.map((commodity) => ({
      symbol: commodity,
    }));

    const encrypt = await hashPassword(password);
    const authCollection = new adminModel({
      userName,
      logo,
      address,
      email,
      password: encrypt,
      contact,
      whatsapp,
      userType,
      solutions: formattedSolutions,
      features: formattedFeatures,
      commodities:formattedCommodities,
      workCompletionDate,
      serviceStartDate: serviceStartDateObj,
      serviceEndDate, // Store the calculated serviceEndDate
    });

    await authCollection.save();
    return authCollection;
  } catch (error) {
    throw new Error("Error saving user data");
  }
};
export const fetchAdminData = async ()=>{
  try {
     return await adminModel.find({})
  } catch (error) {
    throw new Error("Error fetching admin data");
  }
}
export const collectionUpdate = async (adminId, userData) => {
  try {
    const {
      userName,
      logo,
      address,
      email,
      password,
      contact,
      whatsapp,
      userType,
      solutions,
      features,
      workCompletionDate,
      serviceStartDate,
    } = userData;

    const updateData = {};

    // Populate updateData only with provided fields
    if (userName) updateData.userName = userName;
    if (logo) updateData.logo = logo;
    if (address) updateData.address = address;
    if (email) updateData.email = email;

    // Hash password only if it's provided
    if (password) updateData.password = await hashPassword(password);

    if (contact) updateData.contact = contact;
    if (whatsapp) updateData.whatsapp = whatsapp;
    if (userType) updateData.userType = userType;

    // Only map if solutions are provided
    if (solutions) {
      updateData.solutions = solutions.map((solution) => ({
        type: solution,
        enabled: true, // or false, depending on your logic
      }));
    }

    // Only map if features are provided
    if (features) {
      updateData.features = features.map((feature) => ({
        name: feature,
        enabled: true, // or false, depending on your logic
      }));
    }

    if (workCompletionDate) updateData.workCompletionDate = workCompletionDate;

    // Calculate serviceEndDate only if serviceStartDate is provided
    if (serviceStartDate) {
      const serviceStartDateObj = new Date(serviceStartDate);
      const serviceEndDate = new Date(serviceStartDateObj);
      serviceEndDate.setDate(serviceEndDate.getDate() + 365);
      updateData.serviceStartDate = serviceStartDateObj;
      updateData.serviceEndDate = serviceEndDate;
    }

    // Use the $set operator for efficient field updates
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
    throw new Error("Error updating admin data");
  }
};
