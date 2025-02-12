import { PricingOption } from "../../model/pricingOptionModel.js";

export const addPricingOption = async (createdBy, methodType, pricingType, value) => {
  const newPricing = new PricingOption({
    createdBy,
    methodType,
    pricingType,
    value
  });
  return await newPricing.save();
};


export const getLastPricingOption = async (createdBy) => {
  return await PricingOption.findOne({ createdBy }).sort({ createdAt: -1 });  // Get last inserted record
};

export const fetchPricingOption = async (createdBy) => {
    return await PricingOption.find({ createdBy }); 
  };

export const updatePricingOption = async (pricingId, value) => {
  return await PricingOption.findByIdAndUpdate(pricingId, { value }, { new: true });
};

export const deletePricingOption = async (pricingId) => {
  return await PricingOption.findByIdAndDelete(pricingId);
};
