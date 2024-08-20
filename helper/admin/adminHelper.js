import adminModel from "../../model/adminSchema.js";

export const userVerfication = async (email) => {
  try {
    return await adminModel.findOne({ email });

  } catch (error) {
    console.error("Error in userVerfication:", error.message); 
    throw new Error("Verification failed: " + error.message);
  }
};

export const getUserData = async (userEmail) => {
  try {
    return await adminModel.findOne({email: userEmail}).select('-password');

  } catch (error) {
    console.error("Error in finding the user:", error.message); 
    throw new Error("searching failed: " + error.message);
  }
};


export const updateUserData = async (id, email, fullName, mobile, location) => {
  try {
    return await adminModel.findByIdAndUpdate(
      id,
      { 
        email: email,
        userName: fullName,
        contact: mobile,
        address: location
      },
      { new: true, runValidators: true }
    ).select('-password');

  } catch (error) {
    console.error("Error in updateing the user:", error.message); 
    throw new Error("Updation failed: " + error.message);
  }
};

export const updateUserLogo = async (email, logoName) => {
  try {
    return await adminModel.findOneAndUpdate(
      { email: email },
      { logo: logoName },
      { new: true }
    );

  } catch (error) {
    console.error("Error in updating the logo:", error.message); 
    throw new Error("Logo Updation failed: " + error.message);
  }
};

export const getCommodity = async (email) => {
  try {
    return await adminModel.findOne({ email });

  } catch (error) {
    console.error("Error in fetching Commodity:", error.message); 
    throw new Error("fetching failed: " + error.message);
  }
};

export const getMetals = async (userEmail) => {
  try {
    console.log('working');
    return await adminModel.findOne({email: userEmail}).select('-password');

  } catch (error) {
    console.error("Error in finding the metals:", error.message); 
    throw new Error("searching failed: " + error.message);
  }
};