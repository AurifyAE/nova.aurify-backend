import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  companyName: { type: String, required: true },
  logo: { type: String },
  awsS3Key: { 
    type: String, 
    required: true 
  },
  address: { 
    buildingNameNumber: { type: String },
    city: { type: String },
    country: { type: String },
    latitude: { type: String },
    longitude: { type: String }
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordAccessKey: { type: String, required: true },
  contact: { type: String, required: true },
  whatsapp: { type: String, required: true },
  socialMedia: [
    {
      platform: { type: String },
      link: { type: String },
    }
  ],
  workCompletionDate: { type: Date },
  serviceStartDate: { type: Date, required: true },
  serviceEndDate: { type: Date },

  bankDetails: [
    {
      holderName: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      iban: { type: String },
      ifsc: { type: String },
      swift: { type: String },
      branch: { type: String },
      city: { type: String },
      country: { type: String },
      logo: { type: String },
      awsS3Key: { 
        type: String, 
        required: true 
      },
    },
  ],
});

const adminModel = mongoose.model("Admin", adminSchema);
export default adminModel;
