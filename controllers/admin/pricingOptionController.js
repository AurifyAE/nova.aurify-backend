import { addPricingOption, getLastPricingOption, updatePricingOption, fetchPricingOption, deletePricingOption } from "../../helper/admin/pricingOptionHelper.js";


export const createPricingOption = async (req, res) => {
  try {
    const { methodType, pricingType, value } = req.body;
    const createdBy = req.params.adminId;  // Assuming `adminId` is extracted from JWT middleware

    if (!methodType || !pricingType || value === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const newPricing = await addPricingOption(createdBy, methodType, pricingType, value);

    res.status(201).json({ success: true, message: "Pricing option added.", data: newPricing });
  } catch (error) {
    console.error("Error creating pricing option:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};


export const getLatestPricingOption = async (req, res) => {
  try {
    const createdBy = req.params.adminId;  // Extracted from JWT middleware

    const lastPricing = await getLastPricingOption(createdBy);

    if (!lastPricing) {
      return res.status(404).json({ success: false, message: "No pricing options found." });
    }

    res.status(200).json({ success: true, data: lastPricing });
  } catch (error) {
    console.error("Error fetching latest pricing option:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

export const fetchAllPricingOptions = async (req, res) => {
    try {
      const createdBy = req.params.adminId;  // Extracted from JWT middleware
  
      const fetchPricing = await fetchPricingOption(createdBy);
  
      if (!fetchPricing) {
        return res.status(404).json({ success: false, message: "No pricing options found." });
      }
  
      res.status(200).json({ success: true, data: fetchPricing });
    } catch (error) {
      console.error("Error fetching latest pricing option:", error);
      res.status(500).json({ success: false, message: "Internal Server Error." });
    }
  };

export const editPricingOption = async (req, res) => {
  try {
    const { pricingId } = req.params;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({ success: false, message: "Value is required for update." });
    }

    const updatedPricing = await updatePricingOption(pricingId, value);

    res.status(200).json({ success: true, message: "Pricing option updated.", data: updatedPricing });
  } catch (error) {
    console.error("Error updating pricing option:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};


export const removePricingOption = async (req, res) => {
  try {
    const { pricingId } = req.params;

    const deleted = await deletePricingOption(pricingId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Pricing option not found." });
    }

    res.status(200).json({ success: true, message: "Pricing option deleted." });
  } catch (error) {
    console.error("Error deleting pricing option:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};
