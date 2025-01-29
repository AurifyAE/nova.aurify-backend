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

    // Save the updated item in the order
    await order.save();

    // Recalculate order status based on items' statuses
    const hasApprovedItems = order.items.some(
      (item) => item.itemStatus === "Approved"
    );
    const hasPendingItems = order.items.some(
      (item) => item.itemStatus === "User Approval Pending"
    );

    if (hasApprovedItems) {
      // If any item is Approved
      order.orderStatus = "Success";
    } else if (hasPendingItems) {
      // If any item is User Approval Pending
      order.orderStatus = "User Approval Pending";
    } else {
      // Default to Processing if no Approved or Pending items
      order.orderStatus = "Processing";
    }

    // Save the updated order status
    await order.save();

    // Create an appropriate message based on the updated order status
    let message;
    switch (order.orderStatus) {
      case "Success":
        message = `🎉 Great news! At least one item in your order (Transaction ID: ${order.transactionId}) has been approved!`;
        break;
      case "User Approval Pending":
        message = `⚠️ Order ${order.transactionId} requires your attention: Some items need your approval.`;
        break;
      case "Processing":
        message = `✅ Order ${order.transactionId} is being processed. We'll keep you updated!`;
        break;
      default:
        message = `Order ${order.transactionId} status has been updated.`;
    }

    return res.status(200).json({
      success: true,
      message,
      orderStatus: order.orderStatus,
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

    if (fcmTokenDoc && fcmTokenDoc.FCMTokens.length > 0) {
      const invalidTokens = [];

      // Filter pending items
      const pendingItems = order.items.filter(
        (item) => item.itemStatus === "User Approval Pending"
      );

      // Notification sending logic
      for (const item of pendingItems) {
        for (const tokenObj of fcmTokenDoc.FCMTokens) {
          try {
            let notificationResult;

            // Conditional notification based on time
            if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
              notificationResult =
                await NotificationService.sendWarningNotification(
                  tokenObj.token,
                  "⏳ Confirmation Countdown! 🕒",
                  `Review & confirm item quantity (${item.quantity}) before time runs out!`,
                  {
                    orderId: order._id.toString(),
                    itemId: item._id.toString(),
                  }
                );
            } else if (timeSinceNotification >= 5) {
              notificationResult =
                await NotificationService.sendRejectNotification(
                  tokenObj.token,
                  "❌ Order Auto-Canceled 🚫",
                  `⚠️ Auto-Rejected! (Qty: ${item.quantity}) No response detected. Retry? 🔄`,
                  {
                    orderId: order._id.toString(),
                    itemId: item._id.toString(),
                  }
                );
            }

            // Track successful notification
            if (notificationResult) {
              console.log(
                `Notification sent successfully to token: ${tokenObj.token}`
              );
            }
          } catch (error) {
            console.error(
              `Notification error for token: ${tokenObj.token}`,
              error
            );

            // Specifically handle expired/invalid tokens
            if (
              error.errorInfo &&
              (error.errorInfo.code ===
                "messaging/registration-token-not-registered" ||
                error.message.includes("is not registered or has expired"))
            ) {
              invalidTokens.push(tokenObj.token);
            }
          }
        }
      }

      // Remove invalid tokens from user's FCM tokens
      if (invalidTokens.length > 0) {
        await UserFCMTokenModel.updateOne(
          { _id: fcmTokenDoc._id },
          {
            $pull: {
              FCMTokens: {
                token: { $in: invalidTokens },
              },
            },
          }
        );

        console.log(
          `Removed ${invalidTokens.length} invalid tokens for user ${order.userId}`
        );
      }

      // Handle order rejection if applicable
      if (timeSinceNotification >= 5) {
        const pendingItems = order.items.filter(
          (item) => item.itemStatus === "User Approval Pending"
        );

        if (pendingItems.length > 0) {
          // Update item statuses
          pendingItems.forEach((item) => {
            item.itemStatus = "Rejected";
          });

          // Update order remarks and status
          const rejectionRemarks = pendingItems
            .map(
              (item) =>
                `Item (Qty: ${item.quantity}) auto-rejected due to no response.`
            )
            .join("\n");

          order.orderRemark = order.orderRemark
            ? `${order.orderRemark}\n${rejectionRemarks}`
            : rejectionRemarks;

          if (order.items.every((item) => item.itemStatus === "Rejected")) {
            order.orderStatus = "Rejected";
          }

          await order.save();
        }
      }
    }
  }
};

// Start a cron job to check pending orders every minute
cron.schedule("* * * * *", checkPendingOrderNotifications);
