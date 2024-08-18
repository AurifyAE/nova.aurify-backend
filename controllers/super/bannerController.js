import {
  addNewBanner,
  updateBanner,
  removeBanner,
  fetchBannersDetails,
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
      adminId: req.body.adminId,
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
    await removeBanner(req.params.bannerId, req.params.adminId);
    res.json({ message: "Banner deleted successfullyy" }).status(200);
  } catch (error) {
    next(error);
  }
};

export const fetchBanners = async (req, res, next) => {
  try {
    const banners = await fetchBannersDetails();
    res.status(200).json({ info: banners });
  } catch (error) {
    next(error);
  }
};
