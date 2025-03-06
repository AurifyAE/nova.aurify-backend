
import {
    fetchBookingDetails,
    updateOrderDetails,
    updateOrderQuantityHelper,
    updateOrderStatusHelper,
  } from "../../helper/admin/bookingHelper.js";
  import { orderModel } from "../../model/orderSchema.js";

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
  export const orderQuantityConfirmation = async (req, res, next) => {
    try {
      let { orderId, itemId, action } = req.body;
      

      action = action === "true";
  

      const order = await orderModel.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Oops! We couldn't find the order you're looking for.",
        });
      }
  
   
      const item = order.items.find((item) => item._id.toString() === itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "The item you are trying to update does not exist in the order.",
        });
      }
  
      if (item.select) {
        return res.status(400).json({
          success: true,
          message: `You have already ${item.itemStatus.toLowerCase()} this item. Further changes are not allowed.`,
        });
      }
  
    
      item.itemStatus = action ? "Approved" : "Rejected";
     
      item.select = true;
  
 
      const allApproved = order.items.every((i) => i.itemStatus === "Approved");
      const hasPendingItems = order.items.some((i) => i.itemStatus === "User Approval Pending");
      const hasApprovedItems = order.items.some((i) => i.itemStatus === "Approved");
      const hasRejectedItems = order.items.some((i) => i.itemStatus === "Rejected");
  
      // Determine the new order status
      if (allApproved) {
        order.orderStatus = "Success"; // All items approved
      } else if (hasPendingItems) {
        order.orderStatus = "User Approval Pending";
      } else if (hasApprovedItems) {
        order.orderStatus = "Processing"; // At least one approved, still processing
      } else if (hasRejectedItems) {
        order.orderStatus = "Pending"; // Only rejected items exist
      }
  
      await order.save();

      let message;
      let success = true;
  
      if (item.itemStatus === "Rejected") {
        success = false;
        message = `❌ The item ${item.name} in your order ${order.transactionId} has been rejected.`;
      } else if (order.orderStatus === "Success") {
        message = `🎉 Congratulations! Your order (Transaction ID: ${order.transactionId}) has been fully approved!`;
      } else if (order.orderStatus === "User Approval Pending") {
        message = `⚠️ Your order ${order.transactionId} is awaiting approval for some items.`;
      } else if (order.orderStatus === "Processing") {
        message = `🔄 Your order ${order.transactionId} is still being processed. Some items are approved, while others are pending.`;
      } else {
        message = `⚠️ Your order ${order.transactionId} requires review due to rejected items.`;
      }
  
      return res.status(200).json({
        success,
        message,
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
  
