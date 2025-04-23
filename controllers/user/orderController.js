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
      console.log("No pending orders to process.");
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
      
      // Fetch user's FCM tokens
      const fcmTokenDoc = await UserFCMTokenModel.findOne({
        createdBy: order.userId,
      });

      const invalidTokens = [];
      let autoRejectEmailSent = false;

      // Filter pending items
      const pendingItems = order.items.filter(
        (item) => item.itemStatus === "User Approval Pending"
      );
      
      console.log(
        `Found ${pendingItems.length} pending items in order ${order._id}`
      );

      if (pendingItems.length === 0) {
        continue;
      }

      // Process FCM notifications if tokens exist
      if (fcmTokenDoc && fcmTokenDoc.FCMTokens && fcmTokenDoc.FCMTokens.length > 0) {
        console.log(`Found ${fcmTokenDoc.FCMTokens.length} FCM tokens for user ${order.userId}`);
        
        // Process each pending item
        for (const item of pendingItems) {
          console.log(`Processing item ${item._id}, quantity: ${item.quantity}`);
          
          // Process each token
          for (const tokenObj of fcmTokenDoc.FCMTokens) {
            // Skip if token is empty or invalid
            if (!tokenObj.token) {
              console.log("Skipping empty token");
              invalidTokens.push(tokenObj);
              continue;
            }
            
            try {
              let notificationResult;

              // Conditional notification based on time
              if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
                console.log(`Sending warning notification to token: ${tokenObj.token.substring(0, 10)}...`);
                notificationResult = await NotificationService.sendWarningNotification(
                  tokenObj.token,
                  "⏳ Confirmation Countdown! 🕒",
                  `Review & confirm item quantity (${item.quantity}) before time runs out!`,
                  {
                    orderId: order._id.toString(),
                    itemId: item._id.toString(),
                  }
                );
              } else if (timeSinceNotification >= 5) {
                console.log(`Sending reject notification to token: ${tokenObj.token.substring(0, 10)}...`);
                notificationResult = await NotificationService.sendRejectNotification(
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
                  `Notification sent successfully to token: ${tokenObj.token.substring(0, 10)}...`
                );
              }
            } catch (error) {
              console.error(
                `Notification error for token: ${tokenObj.token.substring(0, 10)}...`,
                error
              );

              // Specifically handle expired/invalid tokens - IMPROVED DETECTION
              if (
                (error.errorInfo && 
                 error.errorInfo.code === "messaging/registration-token-not-registered") ||
                (error.message && (
                  error.message.includes("is not registered") ||
                  error.message.includes("token is not registered") ||
                  error.message.includes("has expired") ||
                  error.message.includes("Invalid registration") ||
                  error.message.includes("invalid token")
                ))
              ) {
                console.log(`Adding invalid token to cleanup list`);
                invalidTokens.push(tokenObj);
              }
            }
          }
          
          // Create user notification records based on time thresholds
          try {
            if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
              await createUserNotification(
                order.userId,
                `⏳ Confirmation Countdown! Review & confirm item quantity (${item.quantity}) before time runs out!`
              );
              console.log("Created warning notification in database");
            } else if (timeSinceNotification >= 5) {
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
            if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
              await sendQuantityConfirmationEmail(
                order._id.toString(),
                item._id.toString(),
                item.quantity,
                false // not a rejection email
              );
              console.log("Warning email sent successfully");
            } else if (timeSinceNotification >= 5 && !autoRejectEmailSent) {
              await sendQuantityConfirmationEmail(
                order._id.toString(),
                item._id.toString(),
                item.quantity,
                true // this is a rejection email
              );
              console.log("Auto-reject email sent successfully");
              autoRejectEmailSent = true; // Prevent multiple rejection emails
            }
          } catch (emailError) {
            console.error("Error sending email:", emailError);
          }
        }

        // Remove invalid tokens from user's FCM tokens
        if (invalidTokens.length > 0) {
          try {
            console.log(`Found ${invalidTokens.length} invalid tokens to remove`);
            
            // Extract just the token strings from tokenObj for the $in query if needed
            const invalidTokenStrings = invalidTokens
              .filter(tokenObj => tokenObj.token)
              .map(tokenObj => tokenObj.token);
            
            // Method 1: Remove by token string (most common approach)
            if (invalidTokenStrings.length > 0) {
              await UserFCMTokenModel.updateOne(
                { _id: fcmTokenDoc._id },
                {
                  $pull: {
                    FCMTokens: {
                      token: { $in: invalidTokenStrings }
                    }
                  }
                }
              );
              console.log(`Removed ${invalidTokenStrings.length} invalid token strings`);
            }
            
            // Method 2: If FCMTokens are stored by _id, remove them by _id
            const invalidTokenIds = invalidTokens
              .filter(tokenObj => tokenObj._id)
              .map(tokenObj => tokenObj._id);
              
            if (invalidTokenIds.length > 0) {
              await UserFCMTokenModel.updateOne(
                { _id: fcmTokenDoc._id },
                {
                  $pull: {
                    FCMTokens: {
                      _id: { $in: invalidTokenIds }
                    }
                  }
                }
              );
              console.log(`Removed ${invalidTokenIds.length} invalid tokens by ID`);
            }
            
            // Method 3: Full cleanup - find any empty tokens
            await UserFCMTokenModel.updateOne(
              { _id: fcmTokenDoc._id },
              {
                $pull: {
                  FCMTokens: {
                    $or: [
                      { token: { $exists: false } },
                      { token: null },
                      { token: "" }
                    ]
                  }
                }
              }
            );
            console.log("Performed cleanup of any empty token entries");
            
            console.log(`Token cleanup completed for user ${order.userId}`);
          } catch (tokenUpdateError) {
            console.error("Error removing invalid tokens:", tokenUpdateError);
          }
        }
      } else {
        console.log(`No FCM tokens found for user ${order.userId}, continuing with email notifications only`);
        
        // Even without FCM tokens, still send emails and create database notifications
        for (const item of pendingItems) {
          // Create user notification records
          try {
            if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
              await createUserNotification(
                order.userId,
                `⏳ Confirmation Countdown! Review & confirm item quantity (${item.quantity}) before time runs out!`
              );
              console.log("Created warning notification in database (no FCM tokens)");
            } else if (timeSinceNotification >= 5) {
              await createUserNotification(
                order.userId,
                `❌ Order Auto-Canceled! Item (Qty: ${item.quantity}) was auto-rejected due to no response. Order ID: ${order.transactionId}`
              );
              console.log("Created reject notification in database (no FCM tokens)");
            }
          } catch (notifDbError) {
            console.error("Error creating notification record:", notifDbError);
          }
          
          // Send email notifications
          try {
            if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
              await sendQuantityConfirmationEmail(
                order._id.toString(),
                item._id.toString(),
                item.quantity,
                false // not a rejection email
              );
              console.log("Warning email sent successfully (no FCM tokens)");
            } else if (timeSinceNotification >= 5 && !autoRejectEmailSent) {
              await sendQuantityConfirmationEmail(
                order._id.toString(),
                item._id.toString(),
                item.quantity,
                true // this is a rejection email
              );
              console.log("Auto-reject email sent successfully (no FCM tokens)");
              autoRejectEmailSent = true; // Prevent multiple rejection emails
            }
          } catch (emailError) {
            console.error("Error sending email:", emailError);
          }
        }
      }

      // Handle order rejection if applicable
      if (timeSinceNotification >= 5) {
        try {
          console.log("Processing auto-rejection for pending items...");
          
          // Track the amount that will be deducted from total price and weight
          let priceDeduction = 0;
          let weightDeduction = 0;
          
          // Update pending items as rejected
          pendingItems.forEach((item) => {
            // Calculate price and weight to deduct
            const itemPrice = item.fixedPrice * item.quantity;
            const itemWeight = item.productWeight * item.quantity;
            
            // Add to totals for deduction
            priceDeduction += itemPrice;
            weightDeduction += itemWeight;
            
            // Update item status
            item.itemStatus = "Rejected";
            item.select = true; // Added from your new implementation
            
            console.log(`Rejecting item ${item._id}, deducting price: ${itemPrice}, weight: ${itemWeight}`);
          });

          // Update order totals by subtracting rejected items
          const newTotalPrice = Math.max(0, order.totalPrice - priceDeduction);
          const newTotalWeight = Math.max(0, order.totalWeight - weightDeduction);
          
          console.log(`Updating order totals: old price ${order.totalPrice} -> new price ${newTotalPrice}`);
          console.log(`Updating order weights: old weight ${order.totalWeight} -> new weight ${newTotalWeight}`);
          
          order.totalPrice = newTotalPrice;
          order.totalWeight = newTotalWeight;

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
            console.log("All items rejected, updating order status to Rejected");
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
                  true // this is a rejection email
                );
                console.log("Final auto-reject email sent successfully");
              } catch (finalEmailError) {
                console.error("Error sending final rejection email:", finalEmailError);
              }
            }
          } else {
            // Some items still exist in the order, check if we need to update order status
            const hasActiveItems = order.items.some(
              (item) => item.itemStatus !== "Rejected"
            );
            
            if (hasActiveItems) {
              console.log("Order still has active items, updating totals only");
            } else {
              console.log("No active items remain, setting order status to Rejected");
              order.orderStatus = "Rejected";
            }
          }

          // Save the updated order
          await order.save();
          console.log(`Order ${order._id} updated successfully with recalculated totals`);
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
// cron.schedule("* * * * *", checkPendingOrderNotifications);
