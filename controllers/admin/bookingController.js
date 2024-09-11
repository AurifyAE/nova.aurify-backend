import { fetchBookingDetails } from "../../helper/admin/bookingHelper.js";


export const fetchBookings = async (req, res, next) => {
  try {
    
    const { adminId } = req.params;
    const { message, success, orderDetails } = await fetchBookingDetails(
      adminId
    );
    if (!success || !orderDetails) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to place the order",
      });
    }
    return res.status(200).json({
      success: true,
      orderDetails, // Send the order details to the client
      message: "Orders fetching successfully.",
    });
  } catch (error) {
    next(error);
  }
};
