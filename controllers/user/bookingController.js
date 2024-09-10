import { orderPlace } from "../../helper/user/bookingHelper.js";

export const saveBooking = async (req, res, next) => {
  try {
    const { adminId, userId } = req.params;
    const { message, success, orderDetails } = await orderPlace(
      adminId,
      userId
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
      message: "Order placed successfully.",
    });
  } catch (error) {
    next(error);
  }
};
