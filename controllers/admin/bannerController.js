import BannerModel from '../../model/bannerSchema.js'

export const getBanner = async (req, res) => {
    try {
        console.log(req.params)
      const { userId } = req.params;
  
      // Find banners created by the given 
      console.log(userId);
      const banner = await BannerModel.findOne({ createdBy: userId });
      if (!banner || banner.banner.length === 0) {
        return res.status(404).json({ success: false, message: 'No banners found for this user' });
      }
      res.status(200).json({ success: true, data: banner.banner });
    } catch (error) {
      console.error('Error fetching banners:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch banners', error });
    }
  };