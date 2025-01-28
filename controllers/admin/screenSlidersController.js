import { screenSliderHelper,fetchScreenSliderHelper,updateScreenSliderHelper, deleteSliderImageHelper } from "../../helper/admin/ScreenSliderHelper.js";

export const uploadScreenSlider = async (req, res, next) => {
  try {
    const adminId = req.params.adminId;
    const imageUrls = req.files.map((file) => ({
      key: file.key,
      imageUrl: file.location,
    }));

    const { timeout, sliderId } = req.body;

    // Validate required fields
    if (!sliderId || !timeout || !imageUrls.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (sliderId, timeout, or images).",
      });
    }

    const screenSlider = {
      sliderId,
      timeout: parseInt(timeout, 10),
      imageUrls,
      createdBy: adminId,
    };

  const data = await screenSliderHelper(screenSlider);
    res.status(201).json({
      success: true,
      message: "Screen sliders added successfully.",
      data
    });
  } catch (error) {
    next(error);
  }
};

export const fetchScreenSlider = async (req, res, next) => {
  try {
    const adminId = req.params.adminId;

    // Fetch sliders using the helper
    const sliders = await fetchScreenSliderHelper(adminId);

    res.status(200).json({
      success: true,
      message: "Fetched screen sliders successfully.",
      sliders,
    });
  } catch (error) {
    next(error);
  }
};

export const updateScreenSlider = async (req, res, next) => {
  try {
    const { sliderId, adminId } = req.params; 
    const { timeout } = req.body;

  
    const updatedSliders = await updateScreenSliderHelper(sliderId, adminId, timeout);

    res.status(200).json({
      success: true,
      message: "Screen slider updated successfully.",
      data: updatedSliders,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSliderImage = async (req, res, next) => {
  try {
    const { sliderId, imageName, adminId } = req.params;

    const updatedSliders = await deleteSliderImageHelper(sliderId, imageName, adminId);

    res.status(200).json({
      success: true,
      message: "Image deleted successfully.",
      sliders: updatedSliders, 
    });
  } catch (error) {
    next(error);
  }
};
