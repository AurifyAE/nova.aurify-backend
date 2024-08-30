import BannerModel from '../../model/bannerSchema.js'

export const getBanner = async (req, res) => {
    try {
        console.log(req.params)
      const { userId } = req.params;
  
      // Find banners created by the given 
      console.log(userId);
      const banners = await BannerModel.find({ createdBy: userId });
  
      if (!banners || banners.length === 0) {
        return res.status(404).json({ success: false, message: 'No banners found for this user' });
      }
  
      // Return the banners
      res.status(200).json({ success: true, data: banners });
    } catch (error) {
      console.error('Error fetching banners:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch banners', error });
    }
  };