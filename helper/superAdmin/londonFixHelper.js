import LondonFixModel from "../../model/londonFixSchema.js";
import moment from "moment";

export const addLondonFix = async (data) => {
  try {
    // Normalize incoming date (ensure UTC and remove time part)
    const incomingDate = moment
      .utc(data.date, "YYYY-MM-DD")
      .startOf("day")
      .toDate();

    // Check for duplicate metal types within the request itself
    const metalTypesSet = new Set();
    for (const metal of data.metals) {
      if (metalTypesSet.has(metal.metalType)) {
        return {
          success: false,
          message: `Duplicate metalType "${metal.metalType}" found in request.`,
        };
      }
      metalTypesSet.add(metal.metalType);
    }

    // Find an existing record for this date in UTC
    let existingRecord = await LondonFixModel.findOne({ date: incomingDate });

    if (existingRecord) {
      // Set to track existing metals in the database
      const existingMetalTypes = new Set(
        existingRecord.metals.map((metal) => metal.metalType)
      );

      // Check for duplicate metals before updating
      for (const newMetal of data.metals) {
        if (existingMetalTypes.has(newMetal.metalType)) {
          return {
            success: false,
            message: `Duplicate metalType "${newMetal.metalType}" already exists in the database for this date.`,
          };
        }
      }

      // If no duplicates, add new metals to the record
      existingRecord.metals.push(...data.metals);
      await existingRecord.save();

      return {
        success: true,
        londonFix: existingRecord,
        message: "London Fix updated successfully",
      };
    } else {
      // Create a new record if no entry exists for this date
      const londonFix = new LondonFixModel({
        date: incomingDate,
        metals: data.metals,
      });
      await londonFix.save();

      return {
        success: true,
        londonFix,
        message: "London Fix added successfully",
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Error managing London Fix: " + error.message,
    };
  }
};
export const getAllLondonFix = async () => {
  try {
    // Get today's date in UTC (start of the day)
    const todayStart = moment.utc().startOf("day").toDate(); // 2025-02-22T00:00:00.000Z
    const tomorrowStart = moment.utc().add(1, "day").startOf("day").toDate(); // 2025-02-23T00:00:00.000Z

    // Find today's fix based on UTC date
    const todayFix = await LondonFixModel.findOne({
      date: { $gte: todayStart, $lt: tomorrowStart },
    });

    // Fetch all previous records (history)
    const historyFix = await LondonFixModel.find({
      date: { $lt: todayStart },
    }).sort({ date: -1 });

    return {
      success: true,
      todayFix,
      historyFix,
      message: "London Fix data fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching London Fix data: " + error.message,
    };
  }
};
export const getLondonFixById = async (id) => {
  try {
    const londonFix = await LondonFixModel.findById(id);
    if (!londonFix) return { success: false, message: "London Fix not found" };
    return {
      success: true,
      londonFix,
      message: "London Fix data fetched successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching London Fix: " + error.message,
    };
  }
};

export const updateLondonFix = async (id, updateData) => {
  try {
    // Fetch only the metals array instead of the whole document
    const londonFix = await LondonFixModel.findById(id).select("metals");
    if (!londonFix) return { success: false, message: "London Fix not found" };

    let isUpdated = false;
    const existingMetalsMap = new Map();

    // Convert existing metals array into a Map for O(1) lookups
    for (const metal of londonFix.metals) {
      existingMetalsMap.set(metal.metalType, metal);
    }

    for (const newMetal of updateData.metals) {
      const existingMetal = existingMetalsMap.get(newMetal.metalType);

      if (existingMetal) {
        // If values are identical, skip updating
        if (
          existingMetal.amPrice === newMetal.amPrice &&
          existingMetal.pmPrice === newMetal.pmPrice &&
          existingMetal.noonPrice === newMetal.noonPrice
        ) {
          continue;
        }

        // Update only if values are different
        Object.assign(existingMetal, newMetal);
        isUpdated = true;
      } else {
        // Add new metal if it doesn't exist
        londonFix.metals.push(newMetal);
        isUpdated = true;
      }
    }

    // If no updates were made, return a message without saving
    if (!isUpdated) {
      return {
        success: false,
        message: "No changes made. All metals have the same values.",
      };
    }

    // Save only if there were updates
    await londonFix.save();

    return {
      success: true,
      londonFix,
      message: "London Fix updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Error updating London Fix: " + error.message,
    };
  }
};

export const deleteLondonFix = async (id) => {
  try {
    const londonFix = await LondonFixModel.findByIdAndDelete(id);
    if (!londonFix) return { success: false, message: "London Fix not found" };
    return { success: true, message: "London Fix deleted successfully" };
  } catch (error) {
    return {
      success: false,
      message: "Error deleting London Fix: " + error.message,
    };
  }
};
