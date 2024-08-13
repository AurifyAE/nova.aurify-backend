import adminModel from "../../model/adminSchema.js";
import bcrypt from "bcrypt";


// Function to hash the password
const hashPassword = async (password) => {
  try {
    const hash = await bcrypt.hash(password, 10);
    return hash;
  } catch (error) {
    console.log(error);
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
      workCompletionDate,
      serviceStartDate: serviceStartDateObj,
      serviceEndDate, // Store the calculated serviceEndDate
    });

    await authCollection.save();
    return authCollection;
  } catch (error) {
    throw new Error('Error saving user data');
  }
};


