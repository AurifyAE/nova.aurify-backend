import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  companyName: { type: String, required: true },
  logo: { type: String },
  awsS3Key: { 
    type: String, 
    required: true 
  },
  address: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordAccessKey: { type: String, required: true },
  contact: { type: String, required: true },
  whatsapp: { type: String, required: true },
  userType: { type: String, required: true },
  screenLimit: { type: Number, required: true },
  solutions: [
    {
      type: { type: String, required: true },
      enabled: { type: Boolean, default: true },
    },
  ],
  features: [
    {
      name: { type: String },
      enabled: { type: Boolean, default: true },
    },
  ],
  commodities: [
    {
      symbol: { type: String, required: true },
      enabled: { type: Boolean, default: true },
    },
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
