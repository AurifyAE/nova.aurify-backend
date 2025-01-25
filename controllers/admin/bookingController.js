import {
  fetchBookingDetails,
  updateOrderDetails,
  updateOrderQuantityHelper,
  updateOrderStatusHelper,
} from "../../helper/admin/bookingHelper.js";

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

export const updateOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;
    const { message, success, data } = await updateOrderDetails(
      orderId,
      orderStatus
    );
    if (!success || !data) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to place the order",
      });
    }
    return res.status(200).json({
      success: true,
      data, // Send the order details to the client
      message: "Order update successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderQuantity = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const orderDetails = req.body;
    const { message, success, data } = await updateOrderQuantityHelper(
      orderId,
      orderDetails
    );
    if (!success || !data) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to place the order",
      });
    }
    return res.status(200).json({
      success: true,
      data, // Send the order details to the client
      message: "Order update successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const orderDetails = req.body;
    const { message, success, data } = await updateOrderStatusHelper(
      orderId,
      orderDetails
    );
    if (!success || !data) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to place the order",
      });
    }
    return res.status(200).json({
      success: true,
      data, // Send the order details to the client
      message: "Order update successfully.",
    });
  } catch (error) {
    next(error);
  }
};
