import cron from "node-cron";
import { orderModel } from "../../model/orderSchema.js";
import UserFCMTokenModel from "../../model/userFCMToken.js";
import NotificationService from "../../utils/sendPushNotification.js";
import { fetchBookingDetails } from "../../helper/user/bookingHelper.js";

export const orderQuantityConfirmation = async (req, res, next) => {
  try {
    const { orderId, itemId, action } = req.body;

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in the order",
      });
    }

    item.itemStatus = action ? "Approved" : "Rejected";

    order.orderStatus = order.items.every(
      (item) => item.itemStatus === "Approved"
    )
      ? "Success"
      : action
      ? "Processing"
      : "Rejected";

    const message =
      order.orderStatus === "Success"
        ? "All items approved. Your order has been successfully processed."
        : action
        ? "Item approved. Order is still pending approval for other items."
        : "The selected item has been rejected. Your order is now marked as rejected.";

    await order.save();

    return res.status(200).json({
      success: true,
      message: message,
    });
  } catch (error) {
    next(error);
  }
};

export const fetchUserOrder = async (req, res, next) => {
  try {
    const { adminId, userId } = req.params;

    // Validate required parameters
    if (!adminId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and User ID are required.",
      });
    }

    // Fetch booking details from the helper function
    const result = await fetchBookingDetails(adminId, userId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.orderDetails,
    });
  } catch (error) {
    console.error("Error fetching user order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
    });
  }
};

export const checkPendingOrderNotifications = async () => {
  const pendingOrders = await orderModel.find({
    orderStatus: "User Approval Pending",
    "items.itemStatus": "User Approval Pending",
  });

  if (!pendingOrders.length) {
    console.log("No pending orders to process.");
    return;
  }

  const currentTime = new Date();

  for (const order of pendingOrders) {
    const timeSinceNotification =
      (currentTime - order.notificationSentAt) / (1000 * 60);

    const fcmTokenDoc = await UserFCMTokenModel.findOne({
      createdBy: order.userId,
    });

    if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
      // Send warning notifications for each pending item
      if (fcmTokenDoc && fcmTokenDoc.FCMTokens.length > 0) {
        const invalidTokens = [];

        // Filter out items that are still pending approval
        const pendingItems = order.items.filter(
          (item) => item.itemStatus === "User Approval Pending"
        );

        for (const item of pendingItems) {
          for (const tokenObj of fcmTokenDoc.FCMTokens) {
            try {
              await NotificationService.sendWarningNotification(
                tokenObj.token,
                "⏳ Confirmation Countdown! 🕒",
                `Your order is waiting! Confirm or adjust item quantities before time runs out. Item Quantity: ${item.quantity}`,
                {
                  orderId: order._id.toString(),
                  itemId: item._id.toString(),
                }
              );
            } catch (error) {
              console.error(
                `Failed to send confirmation notification for item ${item._id} to token: ${tokenObj.token}`,
                error
              );

              if (
                error.errorInfo &&
                error.errorInfo.code ===
                  "messaging/registration-token-not-registered"
              ) {
                invalidTokens.push(tokenObj.token);
              }
            }
          }
        }

        // Handle invalid tokens if needed
        if (invalidTokens.length > 0) {
          await UserFCMTokenModel.updateOne(
            { _id: fcmTokenDoc._id },
            { $pull: { FCMTokens: { token: { $in: invalidTokens } } } }
          );
        }
      }
    } else if (timeSinceNotification >= 5) {
      // Reject order items that are still pending
      const pendingItems = order.items.filter(
        (item) => item.itemStatus === "User Approval Pending"
      );

      if (pendingItems.length > 0) {
        pendingItems.forEach((item) => {
          item.itemStatus = "Rejected";
        });

        // Check if all items are rejected
        if (order.items.every((item) => item.itemStatus === "Rejected")) {
          order.orderStatus = "Rejected";
        }

        await order.save();

        // Send rejection notifications for each pending item
        if (fcmTokenDoc && fcmTokenDoc.FCMTokens.length > 0) {
          for (const item of pendingItems) {
            for (const tokenObj of fcmTokenDoc.FCMTokens) {
              try {
                await NotificationService.sendRejectNotification(
                  tokenObj.token,
                  "❌ Order Auto-Canceled 🚫",
                  `Oops! Your item (Quantity: ${item.quantity}) was automatically rejected due to no response. Want to try again?`,
                  {
                    orderId: order._id.toString(),
                    itemId: item._id.toString(),
                  }
                );
              } catch (error) {
                console.error(
                  `Failed to send rejection notification for item ${item._id} to token: ${tokenObj.token}`,
                  error
                );
              }
            }
          }
        }
      }
    }
  }
};

// Start a cron job to check pending orders every minute
cron.schedule("* * * * *", checkPendingOrderNotifications);
