import cron from "node-cron";
import { orderModel } from "../../model/orderSchema.js";
import UserFCMTokenModel from "../../model/userFCMToken.js";
import NotificationService from "../../utils/sendPushNotification.js";
import {
  fetchBookingDetails,
  getUserTransactions,
} from "../../helper/user/bookingHelper.js";
import { sendQuantityConfirmationEmail } from "../../utils/emailService.js";
import userNotification from "../../model/userNotificationSchema.js";
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

    // Add notification to user notification model
    try {
      const userId = order.userId;
      const notificationMessage = message;

      // Find existing user notification document or create a new one
      let userNotificationDoc = await userNotification.findOne({
        createdBy: userId,
      });

      if (userNotificationDoc) {
        // Add notification to existing document
        userNotificationDoc.notification.push({
          message: notificationMessage,
          read: false,
          createdAt: new Date(),
        });
        await userNotificationDoc.save();
      } else {
        userNotificationDoc = new userNotification({
          notification: [
            {
              message: notificationMessage,
              read: false,
              createdAt: new Date(),
            },
          ],
          createdBy: userId,
        });
      }

      await userNotificationDoc.save();
    } catch (notificationError) {
      console.error(
        "Error creating order status notification:",
        notificationError.message
      );
      // Don't return error here, as the status update is already successful
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

export const fetchUserOrder = async (req, res) => {
  try {
    const { adminId, userId } = req.params;
    const { page = 1, limit = 10, orderStatus } = req.query; // Added orderStatus query parameter

    // Convert page & limit to integers
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    if (!adminId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and User ID are required.",
      });
    }

    // Pass orderStatus to fetchBookingDetails
    const result = await fetchBookingDetails(
      adminId,
      userId,
      pageNumber,
      pageSize,
      orderStatus
    );

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
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching user order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
    });
  }
};

export const fetchUserTranstions = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Call helper function to get transactions
    const result = await getUserTransactions(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user transactions",
      error: error.message,
    });
  }
};

export const checkPendingOrderNotifications = async () => {
  try {
    console.log("Starting to check pending orders for notifications...");

    // Query orders with pending status
    const pendingOrders = await orderModel.find({
      orderStatus: "User Approval Pending",
      "items.itemStatus": "User Approval Pending",
    });

    console.log(`Found ${pendingOrders.length} pending orders to process`);

    if (!pendingOrders.length) {
      return;
    }

    const currentTime = new Date();

    // Process each pending order
    for (const order of pendingOrders) {
      console.log(
        `Processing order ${order._id}, transactionId: ${order.transactionId}`
      );

      // Ensure notificationSentAt exists and is a valid date
      if (!order.notificationSentAt) {
        console.log(
          `Order ${order._id} missing notificationSentAt timestamp, setting current time`
        );
        order.notificationSentAt = currentTime;
        await order.save();
        continue; // Skip this iteration to process on next cron run
      }

      // Calculate time since notification was sent
      const notificationSentAt = new Date(order.notificationSentAt);
      const timeSinceNotification =
        (currentTime - notificationSentAt) / (1000 * 60);

      console.log(
        `Time since notification: ${timeSinceNotification.toFixed(2)} minutes`
      );

      // Define notification states based on time thresholds (using your original working thresholds)
      const shouldSendWarning =
        timeSinceNotification >= 2 && timeSinceNotification < 5;
      const shouldAutoReject = timeSinceNotification >= 5;

      if (!shouldSendWarning && !shouldAutoReject) {
        console.log(`No action needed for order ${order._id} at this time`);
        continue;
      }

      console.log(
        `Should send warning: ${shouldSendWarning}, Should auto-reject: ${shouldAutoReject}`
      );

      // Fetch user's FCM tokens
      let fcmTokens = [];
      try {
        const fcmTokenDoc = await UserFCMTokenModel.findOne({
          createdBy: order.userId,
        });

        if (
          fcmTokenDoc &&
          fcmTokenDoc.FCMTokens &&
          fcmTokenDoc.FCMTokens.length > 0
        ) {
          fcmTokens = fcmTokenDoc.FCMTokens.map(
            (tokenObj) => tokenObj.token
          ).filter(Boolean);
          console.log(
            `Found ${fcmTokens.length} tokens for user ${order.userId}`
          );
        } else {
          console.log(
            `No FCM tokens found for user ${order.userId}, continuing with email notifications only`
          );
        }
      } catch (tokenError) {
        console.error(
          `Error fetching FCM tokens for user ${order.userId}:`,
          tokenError
        );
      }

      // Gather pending items
      const pendingItems = order.items.filter(
        (item) => item.itemStatus === "User Approval Pending"
      );
      console.log(
        `Found ${pendingItems.length} pending items in order ${order._id}`
      );

      if (pendingItems.length === 0) {
        continue;
      }

      // Track invalid tokens for cleanup
      const invalidTokens = [];
      let autoRejectEmailSent = false;

      // Process each pending item
      for (const item of pendingItems) {
        console.log(`Processing item ${item._id}, quantity: ${item.quantity}`);

        // Send notifications if tokens are available
        if (fcmTokens.length > 0) {
          for (const token of fcmTokens) {
            try {
              let notificationResult = null;
              
              // Use same conditions as your working code
              if (shouldSendWarning) {
                console.log(`Sending warning notification to token: ${token.substring(0, 10)}...`);
                notificationResult = await NotificationService.sendWarningNotification(
                  token,
                  "⏳ Confirmation Countdown! 🕒",
                  `Review & confirm item quantity (${item.quantity}) before time runs out!`,
                  {
                    orderId: order._id.toString(),
                    itemId: item._id.toString(),
                  }
                );
                console.log("Warning notification result:", !!notificationResult);
              } 
              
              if (shouldAutoReject) {
                console.log(`Sending reject notification to token: ${token.substring(0, 10)}...`);
                notificationResult = await NotificationService.sendRejectNotification(
                  token,
                  "❌ Order Auto-Canceled 🚫",
                  `⚠️ Auto-Rejected! (Qty: ${item.quantity}) No response detected. Retry? 🔄`,
                  {
                    orderId: order._id.toString(),
                    itemId: item._id.toString(),
                  }
                );
                console.log("Reject notification result:", !!notificationResult);
              }
              
              // Track successful notification
              if (notificationResult) {
                console.log(`Notification sent successfully to token: ${token.substring(0, 10)}...`);
              }
            } catch (notifError) {
              console.error(`Error sending notification to token:`, notifError);
              
              // Check for invalid token errors (combining both approaches)
              if (
                (notifError.errorInfo && notifError.errorInfo.code === "messaging/registration-token-not-registered") ||
                (notifError.message && (
                  notifError.message.includes("is not registered") ||
                  notifError.message.includes("token is not registered") ||
                  notifError.message.includes("has expired")
                ))
              ) {
                console.log(`Adding invalid token to cleanup list`);
                invalidTokens.push(token);
              }
            }
          }
        } else {
          console.log("No FCM tokens available to send notification");
        }

        // Always create user notification records
        try {
          if (shouldSendWarning) {
            await createUserNotification(
              order.userId,
              `⏳ Confirmation Countdown! Review & confirm item quantity (${item.quantity}) before time runs out!`
            );
            console.log("Created warning notification in database");
          }
          
          if (shouldAutoReject) {
            await createUserNotification(
              order.userId,
              `❌ Order Auto-Canceled! Item (Qty: ${item.quantity}) was auto-rejected due to no response. Order ID: ${order.transactionId}`
            );
            console.log("Created reject notification in database");
          }
        } catch (notifDbError) {
          console.error("Error creating notification record:", notifDbError);
        }

        // Send email notifications
        try {
          if (shouldSendWarning) {
            await sendQuantityConfirmationEmail(
              order._id.toString(),
              item._id.toString(),
              item.quantity,
              false
            );
            console.log("Warning email sent successfully");
          }
          
          if (shouldAutoReject && !autoRejectEmailSent) {
            await sendQuantityConfirmationEmail(
              order._id.toString(),
              item._id.toString(),
              item.quantity,
              true
            );
            console.log("Auto-reject email sent successfully");
            autoRejectEmailSent = true;
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      // Clean up invalid tokens if any (using the approach from your working code)
      if (invalidTokens.length > 0 && fcmTokens.length > 0) {
        try {
          console.log(`Removing ${invalidTokens.length} invalid tokens`);
          await UserFCMTokenModel.updateOne(
            { createdBy: order.userId },
            {
              $pull: {
                FCMTokens: {
                  token: { $in: invalidTokens },
                },
              },
            }
          );
          console.log(`Removed ${invalidTokens.length} invalid tokens for user ${order.userId}`);
        } catch (tokenUpdateError) {
          console.error("Error removing invalid tokens:", tokenUpdateError);
        }
      }

      // Handle auto-rejection for orders that have exceeded the time limit
      if (shouldAutoReject) {
        try {
          console.log("Processing auto-rejection for pending items...");

          // Update each pending item status to Rejected (simplified from your working code)
          for (const item of pendingItems) {
            item.itemStatus = "Rejected";
            item.select = true;
          }

          // Update order remarks with rejection reason
          const rejectionRemarks = pendingItems
            .map(
              (item) =>
                `Item (Qty: ${item.quantity}) auto-rejected due to no response.`
            )
            .join("\n");

          order.orderRemark = order.orderRemark
            ? `${order.orderRemark}\n${rejectionRemarks}`
            : rejectionRemarks;

          // Check if all items are now rejected
          const allItemsRejected = order.items.every(
            (item) => item.itemStatus === "Rejected"
          );

          if (allItemsRejected) {
            console.log(
              "All items rejected, updating order status to Rejected"
            );
            order.orderStatus = "Rejected";

            // Add final notification
            await createUserNotification(
              order.userId,
              `⚠️ Your order #${order.transactionId} has been completely rejected due to no response to quantity confirmation requests.`
            );

            // Send final email if not already sent
            if (!autoRejectEmailSent) {
              try {
                await sendQuantityConfirmationEmail(
                  order._id.toString(),
                  pendingItems[0]._id.toString(),
                  pendingItems[0].quantity,
                  true
                );
                console.log("Final auto-reject email sent successfully");
              } catch (finalEmailError) {
                console.error(
                  "Error sending final rejection email:",
                  finalEmailError
                );
              }
            }
          }

          // Save the updated order
          await order.save();
          console.log(`Order ${order._id} updated successfully`);
        } catch (rejectionError) {
          console.error("Error in auto-rejection process:", rejectionError);
        }
      }
    }

    console.log("Finished processing all pending orders");
  } catch (mainError) {
    console.error("Main error in checkPendingOrderNotifications:", mainError);
  }
};

// Helper function to create user notifications with better error handling
async function createUserNotification(userId, message) {
  try {
    console.log(`Creating user notification for ${userId}: ${message}`);

    // Find existing notification doc or create new one
    let userNotificationDoc = await userNotification.findOne({
      createdBy: userId,
    });

    if (userNotificationDoc) {
      // Add to existing doc
      userNotificationDoc.notification.push({
        message: message,
        read: false,
        createdAt: new Date(),
      });
    } else {
      // Create new doc
      userNotificationDoc = new userNotification({
        notification: [
          {
            message: message,
            read: false,
            createdAt: new Date(),
          },
        ],
        createdBy: userId,
      });
    }

    await userNotificationDoc.save();
    console.log("User notification created successfully");
    return true;
  } catch (notificationError) {
    console.error("Error creating user notification:", notificationError);
    return false;
  }
}
// Start a cron job to check pending orders every minute
cron.schedule("* * * * *", checkPendingOrderNotifications);
