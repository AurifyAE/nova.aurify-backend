import BannerModel from '../../model/bannerSchema.js'

export const getBanner = async (req, res) => {
    try {
      const { adminId } = req.params;

      const banner = await BannerModel.findOne({ createdBy: adminId });
      if (!banner || banner.banner.length === 0) {
        return res.status(404).json({ success: false, message: 'No banners found for this user' });
      }
      res.status(200).json({ success: true, data: banner.banner });
    } catch (error) {
      console.error('Error fetching banners:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch banners', error });
    }
  };