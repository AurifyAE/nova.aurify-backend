import {
  addNewBanner,
  updateBanner,
  removeBanner,
} from "../../helper/superAdmin/bannerHelper.js";

export const addBanner = async (req, res, next) => {
  try {
    const data = {
      title: req.body.title,
      imageUrl: req.file.filename,
      adminId: req.body.adminId,
    };
    await addNewBanner(data);
    res.json({ message: "Banner add successfully" }).status(201);
  } catch (error) {
    next(error);
  }
};

export const editBannerDetails = async (req, res, next) => {
  try {
    const data = {
      bannerId: req.params.bannerId,
      title: req.body.title,
      imageUrl: req.file.filename,
    };
    await updateBanner(data);
    res.json({ message: "Banner updated successfully" }).status(200);
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const { bannerId } = req.params;
    await removeBanner(bannerId);
    res.json({ message: "Banner deleted successfullyy" }).status(200);
  } catch (error) {
    next(error);
  }
};
