import cron from "node-cron";
import { orderModel } from "../../model/orderSchema.js";
import UserFCMTokenModel from "../../model/userFCMToken.js";
import NotificationService from "../../utils/sendPushNotification.js";
import {
  fetchBookingDetails,
  getUserTransactions,
  approveOrderItemHelper,
  rejectOrderItemHelper
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
export const getPendingApprovalOrders = async (req, res, next) => {
  try {
    const { userId } = req.query; // or get from req.user if using auth middleware

    const pendingOrders = await orderModel
      .find({
        userId: userId,
        orderStatus: "User Approval Pending",
      })
      .populate("items.productId");

    // Filter to show only items that need user approval
    const ordersWithPendingItems = pendingOrders
      .map((order) => ({
        ...order.toObject(),
        items: order.items.filter(
          (item) => item.itemStatus === "User Approval Pending"
        ),
      }))
      .filter((order) => order.items.length > 0);

    return res.status(200).json({
      success: true,
      data: ordersWithPendingItems,
      message: "Pending approval orders retrieved successfully.",
    });
  } catch (error) {
    next(error);
  }
};
export const rejectOrderItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { userId, rejectionReason } = req.body;
    
    const { message, success, data } = await rejectOrderItemHelper(
      orderId,
      itemId,
      userId,
      rejectionReason
    );
    
    if (!success || !data) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to reject the order item",
      });
    }
    
    return res.status(200).json({
      success: true,
      data,
      message: "Order item rejected successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const approveOrderItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { userId, quantity, fixedPrice, productWeight } = req.body; // Accept new values
    
    const { message, success, data } = await approveOrderItemHelper(
      orderId,
      itemId,
      userId,
      { quantity, fixedPrice, productWeight }
    );
    
    if (!success || !data) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to approve the order item",
      });
    }
    
    return res.status(200).json({
      success: true,
      data,
      message: "Order item approved successfully.",
    });
  } catch (error) {
    next(error);
  }
};


// export const checkPendingOrderNotifications = async () => {
//   try {
//     console.log("Starting to check pending orders for notifications...");

//     // Part 1: Handle "User Approval Pending" orders (original functionality)
//     const userPendingOrders = await orderModel.find({
//       orderStatus: "User Approval Pending",
//       "items.itemStatus": "User Approval Pending",
//     });

//     console.log(
//       `Found ${userPendingOrders.length} user pending orders to process`
//     );

//     // Process orders requiring user approval (original functionality)
//     if (userPendingOrders.length > 0) {
//       await processUserPendingOrders(userPendingOrders);
//     }

//     // Part 2: Handle "Processing" orders with "Approval Pending" items (new functionality)
//     const adminPendingOrders = await orderModel.find({
//       orderStatus: "Processing",
//       "items.itemStatus": "Approval Pending",
//     });

//     console.log(
//       `Found ${adminPendingOrders.length} admin pending orders to process`
//     );

//     // Process orders requiring admin approval (new functionality)
//     if (adminPendingOrders.length > 0) {
//       await processAdminPendingOrders(adminPendingOrders);
//     }

//     console.log("Finished processing all pending orders");
//   } catch (mainError) {
//     console.error("Main error in checkPendingOrderNotifications:", mainError);
//   }
// };

// Function to process orders that require admin approval within 5 minutes
// async function processAdminPendingOrders(orders) {
//   const currentTime = new Date();

//   for (const order of orders) {
//     try {
//       console.log(
//         `Processing admin pending order ${order._id}, transactionId: ${order.transactionId}`
//       );

//       // Calculate time since order was placed
//       const orderDate = new Date(order.orderDate);
//       const minutesSinceOrder = (currentTime - orderDate) / (1000 * 60);

//       console.log(
//         `Time since order placement: ${minutesSinceOrder.toFixed(2)} minutes`
//       );

//       // Filter pending items requiring admin approval
//       const pendingItems = order.items.filter(
//         (item) => item.itemStatus === "Approval Pending"
//       );

//       console.log(
//         `Found ${pendingItems.length} admin pending items in order ${order._id}`
//       );

//       if (pendingItems.length === 0) {
//         continue;
//       }

//       // Fetch user's FCM tokens for notifications
//       const fcmTokenDoc = await UserFCMTokenModel.findOne({
//         createdBy: order.userId,
//       });

//       let autoRejectEmailSent = false;
//       const invalidTokens = [];

//       // Handle warning notifications (2-5 minute window)
//       if (minutesSinceOrder >= 2 && minutesSinceOrder < 5) {
//         await sendAdminPendingNotifications(
//           order,
//           pendingItems,
//           fcmTokenDoc,
//           invalidTokens,
//           "warning",
//           autoRejectEmailSent
//         );
//       }
//       // Handle auto-rejection (after 5 minutes)
//       else if (minutesSinceOrder >= 5) {
//         await sendAdminPendingNotifications(
//           order,
//           pendingItems,
//           fcmTokenDoc,
//           invalidTokens,
//           "reject",
//           autoRejectEmailSent
//         );

//         // Process the auto-rejection for these items
//         await processAdminAutoRejection(order, pendingItems);
//       }

//       // Clean up invalid tokens if found
//       if (invalidTokens.length > 0 && fcmTokenDoc) {
//         await cleanupInvalidTokens(fcmTokenDoc, invalidTokens);
//       }
//     } catch (orderError) {
//       console.error(
//         `Error processing admin pending order ${order._id}:`,
//         orderError
//       );
//     }
//   }
// }

// // Function to send notifications for admin pending orders
// async function sendAdminPendingNotifications(
//   order,
//   pendingItems,
//   fcmTokenDoc,
//   invalidTokens,
//   type,
//   autoRejectEmailSent
// ) {
//   // Create appropriate messages based on notification type
//   const title =
//     type === "warning"
//       ? "⏳ Admin Approval Deadline! 🕒"
//       : "❌ Order Items Auto-Rejected 🚫";

//   for (const item of pendingItems) {
//     console.log(
//       `Processing ${type} notifications for admin pending item ${item._id}`
//     );

//     // Create message based on notification type
//     const message =
//       type === "warning"
//         ? `Your order item (Qty: ${item.quantity}) will be auto-rejected soon if not approved by admin.`
//         : `⚠️ Auto-Rejected! Item (Qty: ${item.quantity}) was not approved by admin in time. Order ID: ${order.transactionId}`;

//     // Send in-app notification
//     try {
//       await createUserNotification(
//         order.userId,
//         message,
//         order._id,
//         item._id,
//         type === "warning" ? "Approval-Pending" : "Auto-Rejected"
//       );
//       console.log(
//         `Created ${type} notification in database for admin pending item`
//       );
//     } catch (notifDbError) {
//       console.error("Error creating notification record:", notifDbError);
//     }

//     // Send FCM push notifications if tokens exist
//     if (
//       fcmTokenDoc &&
//       fcmTokenDoc.FCMTokens &&
//       fcmTokenDoc.FCMTokens.length > 0
//     ) {
//       for (const tokenObj of fcmTokenDoc.FCMTokens) {
//         if (!tokenObj.token) {
//           invalidTokens.push(tokenObj);
//           continue;
//         }

//         try {
//           let notificationResult;
//           if (type === "warning") {
//             notificationResult =
//               await NotificationService.sendWarningNotification(
//                 tokenObj.token,
//                 title,
//                 message,
//                 {
//                   orderId: order._id.toString(),
//                   itemId: item._id.toString(),
//                 }
//               );
//           } else {
//             notificationResult =
//               await NotificationService.sendRejectNotification(
//                 tokenObj.token,
//                 title,
//                 message,
//                 {
//                   orderId: order._id.toString(),
//                   itemId: item._id.toString(),
//                 }
//               );
//           }

//           if (notificationResult) {
//             console.log(
//               `Admin pending ${type} notification sent to token: ${tokenObj.token.substring(
//                 0,
//                 10
//               )}...`
//             );
//           }
//         } catch (error) {
//           console.error(
//             `Notification error for token: ${tokenObj.token.substring(
//               0,
//               10
//             )}...`,
//             error
//           );

//           // Handle invalid tokens
//           if (
//             (error.errorInfo &&
//               error.errorInfo.code ===
//                 "messaging/registration-token-not-registered") ||
//             (error.message &&
//               (error.message.includes("is not registered") ||
//                 error.message.includes("token is not registered") ||
//                 error.message.includes("has expired") ||
//                 error.message.includes("Invalid registration") ||
//                 error.message.includes("invalid token")))
//           ) {
//             invalidTokens.push(tokenObj);
//           }
//         }
//       }
//     }

//     // Send email notification
//     try {
//       if (type === "warning") {
//         // Send warning email
//         await sendQuantityConfirmationEmail(
//           order._id.toString(),
//           item._id.toString(),
//           item.quantity,
//           false, // not a rejection email
//           true // admin pending
//         );
//         console.log("Admin warning email sent successfully");
//       } else if (type === "reject" && !autoRejectEmailSent) {
//         // Send rejection email (only once per order)
//         await sendQuantityConfirmationEmail(
//           order._id.toString(),
//           item._id.toString(),
//           item.quantity,
//           true, // this is a rejection email
//           true // admin pending
//         );
//         console.log("Admin auto-reject email sent successfully");
//         autoRejectEmailSent = true;
//       }
//     } catch (emailError) {
//       console.error("Error sending admin notification email:", emailError);
//     }
//   }
// }

// // Process auto-rejection for admin pending items
// async function processAdminAutoRejection(order, pendingItems) {
//   try {
//     console.log("Processing auto-rejection for admin pending items...");

//     // Track deductions from order totals
//     let priceDeduction = 0;
//     let weightDeduction = 0;

//     // Update pending items as rejected
//     pendingItems.forEach((item) => {
//       // Calculate price and weight to deduct
//       const itemPrice = item.fixedPrice * item.quantity;
//       const itemWeight = item.productWeight * item.quantity;

//       // Add to totals for deduction
//       priceDeduction += itemPrice;
//       weightDeduction += itemWeight;

//       // Update item status
//       item.itemStatus = "Rejected";
//       item.select = true;

//       console.log(
//         `Auto-rejecting admin pending item ${item._id}, deducting price: ${itemPrice}, weight: ${itemWeight}`
//       );
//     });

//     // Update order totals
//     const newTotalPrice = Math.max(0, order.totalPrice - priceDeduction);
//     const newTotalWeight = Math.max(0, order.totalWeight - weightDeduction);

//     console.log(
//       `Updating order totals: old price ${order.totalPrice} -> new price ${newTotalPrice}`
//     );
//     console.log(
//       `Updating order weights: old weight ${order.totalWeight} -> new weight ${newTotalWeight}`
//     );

//     order.totalPrice = newTotalPrice;
//     order.totalWeight = newTotalWeight;

//     // Update order remarks with rejection reason
//     const rejectionRemarks = pendingItems
//       .map(
//         (item) =>
//           `Item (Qty: ${item.quantity}) auto-rejected due to admin inaction.`
//       )
//       .join("\n");

//     order.orderRemark = order.orderRemark
//       ? `${order.orderRemark}\n${rejectionRemarks}`
//       : rejectionRemarks;

//     // Check if all items are now rejected
//     const allItemsRejected = order.items.every(
//       (item) => item.itemStatus === "Rejected"
//     );

//     if (allItemsRejected) {
//       console.log("All items rejected, updating order status to Rejected");
//       order.orderStatus = "Rejected";

//       // Add final notification
//       await createUserNotification(
//         order.userId,
//         `⚠️ Your order #${order.transactionId} has been completely rejected due to lack of admin approval.`,
//         order._id,
//         item._id,
//         "Auto-Rejected"
//       );
//     } else {
//       // Some items still exist in the order, check if we need to update order status
//       const hasActiveItems = order.items.some(
//         (item) => item.itemStatus !== "Rejected"
//       );

//       if (hasActiveItems) {
//         console.log("Order still has active items, updating totals only");
//       } else {
//         console.log("No active items remain, setting order status to Rejected");
//         order.orderStatus = "Rejected";
//       }
//     }

//     // Save the updated order
//     await order.save();
//     console.log(
//       `Order ${order._id} updated successfully with recalculated totals after admin auto-rejection`
//     );
//   } catch (rejectionError) {
//     console.error("Error in admin auto-rejection process:", rejectionError);
//   }
// }

// // Function to handle the original user approval pending orders
// async function processUserPendingOrders(orders) {
//   const currentTime = new Date();

//   for (const order of orders) {
//     try {
//       console.log(
//         `Processing user pending order ${order._id}, transactionId: ${order.transactionId}`
//       );

//       // Ensure notificationSentAt exists and is a valid date
//       if (!order.notificationSentAt) {
//         console.log(
//           `Order ${order._id} missing notificationSentAt timestamp, setting current time`
//         );
//         order.notificationSentAt = currentTime;
//         await order.save();
//         continue; // Skip this iteration to process on next cron run
//       }

//       // Calculate time since notification was sent
//       const notificationSentAt = new Date(order.notificationSentAt);
//       const timeSinceNotification =
//         (currentTime - notificationSentAt) / (1000 * 60);

//       console.log(
//         `Time since notification: ${timeSinceNotification.toFixed(2)} minutes`
//       );

//       // Fetch user's FCM tokens
//       const fcmTokenDoc = await UserFCMTokenModel.findOne({
//         createdBy: order.userId,
//       });

//       const invalidTokens = [];
//       let autoRejectEmailSent = false;

//       // Filter pending items
//       const pendingItems = order.items.filter(
//         (item) => item.itemStatus === "User Approval Pending"
//       );

//       console.log(
//         `Found ${pendingItems.length} user pending items in order ${order._id}`
//       );

//       if (pendingItems.length === 0) {
//         continue;
//       }

//       // Process FCM notifications if tokens exist
//       if (
//         fcmTokenDoc &&
//         fcmTokenDoc.FCMTokens &&
//         fcmTokenDoc.FCMTokens.length > 0
//       ) {
//         console.log(
//           `Found ${fcmTokenDoc.FCMTokens.length} FCM tokens for user ${order.userId}`
//         );

//         // Process each pending item
//         for (const item of pendingItems) {
//           console.log(
//             `Processing item ${item._id}, quantity: ${item.quantity}`
//           );

//           // Process each token
//           for (const tokenObj of fcmTokenDoc.FCMTokens) {
//             // Skip if token is empty or invalid
//             if (!tokenObj.token) {
//               console.log("Skipping empty token");
//               invalidTokens.push(tokenObj);
//               continue;
//             }

//             try {
//               let notificationResult;

//               // Conditional notification based on time
//               if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
//                 console.log(
//                   `Sending warning notification to token: ${tokenObj.token.substring(
//                     0,
//                     10
//                   )}...`
//                 );
//                 notificationResult =
//                   await NotificationService.sendWarningNotification(
//                     tokenObj.token,
//                     "⏳ Confirmation Countdown! 🕒",
//                     `Review & confirm item quantity (${item.quantity}) before time runs out!`,
//                     {
//                       orderId: order._id.toString(),
//                       itemId: item._id.toString(),
//                     }
//                   );
//               } else if (timeSinceNotification >= 5) {
//                 console.log(
//                   `Sending reject notification to token: ${tokenObj.token.substring(
//                     0,
//                     10
//                   )}...`
//                 );
//                 notificationResult =
//                   await NotificationService.sendRejectNotification(
//                     tokenObj.token,
//                     "❌ Order Auto-Canceled 🚫",
//                     `⚠️ Auto-Rejected! (Qty: ${item.quantity}) No response detected. Retry? 🔄`,
//                     {
//                       orderId: order._id.toString(),
//                       itemId: item._id.toString(),
//                     }
//                   );
//               }

//               // Track successful notification
//               if (notificationResult) {
//                 console.log(
//                   `Notification sent successfully to token: ${tokenObj.token.substring(
//                     0,
//                     10
//                   )}...`
//                 );
//               }
//             } catch (error) {
//               console.error(
//                 `Notification error for token: ${tokenObj.token.substring(
//                   0,
//                   10
//                 )}...`,
//                 error
//               );

//               // Specifically handle expired/invalid tokens - IMPROVED DETECTION
//               if (
//                 (error.errorInfo &&
//                   error.errorInfo.code ===
//                     "messaging/registration-token-not-registered") ||
//                 (error.message &&
//                   (error.message.includes("is not registered") ||
//                     error.message.includes("token is not registered") ||
//                     error.message.includes("has expired") ||
//                     error.message.includes("Invalid registration") ||
//                     error.message.includes("invalid token")))
//               ) {
//                 console.log(`Adding invalid token to cleanup list`);
//                 invalidTokens.push(tokenObj);
//               }
//             }
//           }

//           // Create user notification records based on time thresholds
//           try {
//             if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
//               await createUserNotification(
//                 order.userId,
//                 `⏳ Confirmation Countdown! Review & confirm item quantity (${item.quantity}) before time runs out!`,
//                 order._id,
//                 item._id,
//                 "Approval-Pending"
//               );
//               console.log("Created warning notification in database");
//             } else if (timeSinceNotification >= 5) {
//               await createUserNotification(
//                 order.userId,
//                 `❌ Order Auto-Canceled! Item (Qty: ${item.quantity}) was auto-rejected due to no response. Order ID: ${order.transactionId}`,
//                 order._id,
//                 item._id,
//                 "Auto-Rejected"
//               );
//               console.log("Created reject notification in database");
//             }
//           } catch (notifDbError) {
//             console.error("Error creating notification record:", notifDbError);
//           }

//           // Send email notifications
//           try {
//             if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
//               await sendQuantityConfirmationEmail(
//                 order._id.toString(),
//                 item._id.toString(),
//                 item.quantity,
//                 false, // not a rejection email
//                 false // not admin pending
//               );
//               console.log("Warning email sent successfully");
//             } else if (timeSinceNotification >= 5 && !autoRejectEmailSent) {
//               await sendQuantityConfirmationEmail(
//                 order._id.toString(),
//                 item._id.toString(),
//                 item.quantity,
//                 true, // this is a rejection email
//                 false // not admin pending
//               );
//               console.log("Auto-reject email sent successfully");
//               autoRejectEmailSent = true; // Prevent multiple rejection emails
//             }
//           } catch (emailError) {
//             console.error("Error sending email:", emailError);
//           }
//         }

//         // Clean up invalid tokens if any were found
//         if (invalidTokens.length > 0) {
//           await cleanupInvalidTokens(fcmTokenDoc, invalidTokens);
//         }
//       } else {
//         console.log(
//           `No FCM tokens found for user ${order.userId}, continuing with email notifications only`
//         );

//         // Even without FCM tokens, still send emails and create database notifications
//         for (const item of pendingItems) {
//           // Create user notification records
//           try {
//             if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
//               await createUserNotification(
//                 order.userId,
//                 `⏳ Confirmation Countdown! Review & confirm item quantity (${item.quantity}) before time runs out!`,
//                 order._id,
//                 item._id,
//                 "Approval-Pending"
//               );
//               console.log(
//                 "Created warning notification in database (no FCM tokens)"
//               );
//             } else if (timeSinceNotification >= 5) {
//               await createUserNotification(
//                 order.userId,
//                 `❌ Order Auto-Canceled! Item (Qty: ${item.quantity}) was auto-rejected due to no response. Order ID: ${order.transactionId}`,
//                 order._id,
//                 item._id,
//                 "Auto-Rejected"
//               );
//               console.log(
//                 "Created reject notification in database (no FCM tokens)"
//               );
//             }
//           } catch (notifDbError) {
//             console.error("Error creating notification record:", notifDbError);
//           }

//           // Send email notifications
//           try {
//             if (timeSinceNotification >= 2 && timeSinceNotification < 5) {
//               await sendQuantityConfirmationEmail(
//                 order._id.toString(),
//                 item._id.toString(),
//                 item.quantity,
//                 false, // not a rejection email
//                 false // not admin pending
//               );
//               console.log("Warning email sent successfully (no FCM tokens)");
//             } else if (timeSinceNotification >= 5 && !autoRejectEmailSent) {
//               await sendQuantityConfirmationEmail(
//                 order._id.toString(),
//                 item._id.toString(),
//                 item.quantity,
//                 true, // this is a rejection email
//                 false // not admin pending
//               );
//               console.log(
//                 "Auto-reject email sent successfully (no FCM tokens)"
//               );
//               autoRejectEmailSent = true; // Prevent multiple rejection emails
//             }
//           } catch (emailError) {
//             console.error("Error sending email:", emailError);
//           }
//         }
//       }

//       // Handle order rejection if applicable
//       if (timeSinceNotification >= 5) {
//         await processUserAutoRejection(order, pendingItems);
//       }
//     } catch (orderError) {
//       console.error(
//         `Error processing user pending order ${order._id}:`,
//         orderError
//       );
//     }
//   }
// }

// // Handle user auto-rejection process
// async function processUserAutoRejection(order, pendingItems) {
//   try {
//     console.log("Processing auto-rejection for user pending items...");

//     // Track the amount that will be deducted from total price and weight
//     let priceDeduction = 0;
//     let weightDeduction = 0;

//     // Update pending items as rejected
//     pendingItems.forEach((item) => {
//       // Calculate price and weight to deduct
//       const itemPrice = item.fixedPrice * item.quantity;
//       const itemWeight = item.productWeight * item.quantity;

//       // Add to totals for deduction
//       priceDeduction += itemPrice;
//       weightDeduction += itemWeight;

//       // Update item status
//       item.itemStatus = "Rejected";
//       item.select = true; // Added from your new implementation

//       console.log(
//         `Rejecting item ${item._id}, deducting price: ${itemPrice}, weight: ${itemWeight}`
//       );
//     });

//     // Update order totals by subtracting rejected items
//     const newTotalPrice = Math.max(0, order.totalPrice - priceDeduction);
//     const newTotalWeight = Math.max(0, order.totalWeight - weightDeduction);

//     console.log(
//       `Updating order totals: old price ${order.totalPrice} -> new price ${newTotalPrice}`
//     );
//     console.log(
//       `Updating order weights: old weight ${order.totalWeight} -> new weight ${newTotalWeight}`
//     );

//     order.totalPrice = newTotalPrice;
//     order.totalWeight = newTotalWeight;

//     // Update order remarks with rejection reason
//     const rejectionRemarks = pendingItems
//       .map(
//         (item) =>
//           `Item (Qty: ${item.quantity}) auto-rejected due to no response.`
//       )
//       .join("\n");

//     order.orderRemark = order.orderRemark
//       ? `${order.orderRemark}\n${rejectionRemarks}`
//       : rejectionRemarks;

//     // Check if all items are now rejected
//     const allItemsRejected = order.items.every(
//       (item) => item.itemStatus === "Rejected"
//     );

//     if (allItemsRejected) {
//       console.log("All items rejected, updating order status to Rejected");
//       order.orderStatus = "Rejected";

//       // Add final notification
//       await createUserNotification(
//         order.userId,
//         `⚠️ Your order #${order.transactionId} has been completely rejected due to no response to quantity confirmation requests.`,
//         order._id,
//         null,
//         "Order-Rejected"
//       );
//     } else {
//       // Some items still exist in the order, check if we need to update order status
//       const hasActiveItems = order.items.some(
//         (item) => item.itemStatus !== "Rejected"
//       );

//       if (hasActiveItems) {
//         console.log("Order still has active items, updating totals only");
//       } else {
//         console.log("No active items remain, setting order status to Rejected");
//         order.orderStatus = "Rejected";
//       }
//     }

//     // Save the updated order
//     await order.save();
//     console.log(
//       `Order ${order._id} updated successfully with recalculated totals after user auto-rejection`
//     );
//   } catch (rejectionError) {
//     console.error("Error in user auto-rejection process:", rejectionError);
//   }
// }

// // Clean up invalid tokens
// async function cleanupInvalidTokens(fcmTokenDoc, invalidTokens) {
//   try {
//     console.log(`Found ${invalidTokens.length} invalid tokens to remove`);

//     // Extract just the token strings from tokenObj for the $in query if needed
//     const invalidTokenStrings = invalidTokens
//       .filter((tokenObj) => tokenObj.token)
//       .map((tokenObj) => tokenObj.token);

//     // Method 1: Remove by token string (most common approach)
//     if (invalidTokenStrings.length > 0) {
//       await UserFCMTokenModel.updateOne(
//         { _id: fcmTokenDoc._id },
//         {
//           $pull: {
//             FCMTokens: {
//               token: { $in: invalidTokenStrings },
//             },
//           },
//         }
//       );
//       console.log(
//         `Removed ${invalidTokenStrings.length} invalid token strings`
//       );
//     }

//     // Method 2: If FCMTokens are stored by _id, remove them by _id
//     const invalidTokenIds = invalidTokens
//       .filter((tokenObj) => tokenObj._id)
//       .map((tokenObj) => tokenObj._id);

//     if (invalidTokenIds.length > 0) {
//       await UserFCMTokenModel.updateOne(
//         { _id: fcmTokenDoc._id },
//         {
//           $pull: {
//             FCMTokens: {
//               _id: { $in: invalidTokenIds },
//             },
//           },
//         }
//       );
//       console.log(`Removed ${invalidTokenIds.length} invalid tokens by ID`);
//     }

//     // Method 3: Full cleanup - find any empty tokens
//     await UserFCMTokenModel.updateOne(
//       { _id: fcmTokenDoc._id },
//       {
//         $pull: {
//           FCMTokens: {
//             $or: [
//               { token: { $exists: false } },
//               { token: null },
//               { token: "" },
//             ],
//           },
//         },
//       }
//     );
//     console.log("Performed cleanup of any empty token entries");

//     console.log(`Token cleanup completed for user ${fcmTokenDoc.createdBy}`);
//   } catch (tokenUpdateError) {
//     console.error("Error removing invalid tokens:", tokenUpdateError);
//   }
// }

// // Helper function to create user notifications with better error handling
// async function createUserNotification(
//   userId,
//   message,
//   orderId = null,
//   itemId = null,
//   type = "default"
// ) {
//   try {
//     console.log(`Creating user notification for ${userId}: ${message}`);

//     let userNotificationDoc = await userNotification.findOne({
//       createdBy: userId,
//     });

//     const notificationObj = {
//       message: message,
//       read: false,
//       createdAt: new Date(),
//       orderId: orderId,
//       itemId: itemId,
//       type: type,
//     };

//     if (userNotificationDoc) {
//       userNotificationDoc.notification.push(notificationObj);
//     } else {
//       userNotificationDoc = new userNotification({
//         notification: [notificationObj],
//         createdBy: userId,
//       });
//     }

//     await userNotificationDoc.save();
//     console.log("User notification created successfully");
//     return true;
//   } catch (notificationError) {
//     console.error("Error creating user notification:", notificationError);
//     return false;
//   }
// }

// Start a cron job to check pending orders every minute
// cron.schedule("* * * * *", checkPendingOrderNotifications);
