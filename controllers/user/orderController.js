import cron from "node-cron";
import { orderModel } from "../../model/orderSchema.js";
import UserFCMTokenModel from "../../model/userFCMToken.js";
import NotificationService from "../../utils/sendPushNotification.js";
import { fetchBookingDetails } from "../../helper/user/bookingHelper.js";

export const orderQuantityConfirmation = async (req, res, next) => {
  try {
    const { orderId, itemId, action } = req.body;

    // Find the order by ID
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Oops! We couldn't find the order you're looking for.",
      });
    }

    // Find the specific item in the order
    const item = order.items.find((item) => item._id.toString() === itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          "The item you are trying to update does not exist in the order.",
      });
    }

    // Update item status based on action (true: Approved, false: Rejected)
    item.itemStatus = action ? "Approved" : "Rejected";

    // If action is false (rejected), add remark to orderRemark with transaction ID
    if (!action) {
      order.orderRemark = `Order Transaction ID: ${order.transactionId} - Some items have been rejected. The order cannot proceed further.`;
    }

    // Update the overall order status
    order.orderStatus = order.items.every(
      (item) => item.itemStatus === "Approved"
    )
      ? "Success"
      : action
      ? "Processing"
      : "Rejected";

    // Determine attractive response message
    const message =
      order.orderStatus === "Success"
        ? `🎉 Your order with Transaction ID: ${order.transactionId} has been successfully processed!`
        : action
        ? `✅ Item approved! Your order with Transaction ID: ${order.transactionId} is still in process.`
        : `⚠️ Attention: Your order with Transaction ID: ${order.transactionId} has been rejected due to certain items. Please review it.`;

    // Save the updated order model
    await order.save();

    return res.status(200).json({
      success: true,
      message: message,
      ...(order.orderRemark && { remark: order.orderRemark }),
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

        // Add remark for the rejected item
        order.orderRemark = order.orderRemark || "";
        order.orderRemark += `\nYour item (Quantity: ${item.quantity}) was automatically rejected due to no response.`;

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
