import nodemailer from "nodemailer";
import mjml2html from "mjml";
import mongoose from "mongoose";
import { orderModel } from "../../model/orderSchema.js";
import UserFCMTokenModel from "../../model/userFCMToken.js";
import NotificationService from "../../utils/sendPushNotification.js";
import { TransactionModel } from "../../model/transaction.js";
import { UsersModel } from "../../model/usersSchema.js";
import adminModel from "../../model/adminSchema.js";
import userNotification from "../../model/userNotificationSchema.js";
import OrderStatusService from "../../utils/EmailTemplateBuilder.js"; // Adjust the import path as needed

export const updateOrderDetails = async (orderId, adminId, orderStatus) => {
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return {
      success: false,
      message: "Invalid order ID format",
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch and update the order status first
    const updatedOrder = await orderModel
      .findByIdAndUpdate(
        orderId,
        { orderStatus },
        { new: true, runValidators: true, session }
      )
      .populate("items.productId")
      .lean(); // IMPORTANT: Use .lean() to get plain objects without Mongoose metadata

    if (!updatedOrder) {
      await session.abortTransaction();
      session.endSession();
      return {
        success: false,
        message: "Order not found",
      };
    }

    const userId = updatedOrder.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      session.endSession();
      return {
        success: false,
        message: "Invalid user ID associated with order",
      };
    }

    // Fetch user data - use .lean() to avoid session serialization issues
    const user = await UsersModel.findOne(
      { "users._id": userId },
      { "users.$": 1 }
    )
      .session(session)
      .lean(); // Use .session() method instead of passing in options

    if (!user || !user.users.length) {
      await session.abortTransaction();
      session.endSession();
      return {
        success: false,
        message: "User not found",
      };
    }

    const currentUser = user.users[0];

    console.log(adminId);
    // Fetch admin info - use .lean() to get plain object
    const adminInfo = await adminModel
      .findOne({ _id: adminId })
      .session(session)
      .lean();
    console.log(adminInfo);
    if (!adminInfo) {
      console.warn(`Admin not found for adminId: ${adminId}`);
    }

    // Prepare adminData - ensure it's a clean object without session references
    const adminData = {
      companyName: adminInfo?.companyName || "Aurify",
      email: adminInfo?.email || "info@aurify.ae",
      contact: adminInfo?.contact || "+971-XXX-XXXX",
      logo:
        adminInfo?.logo ||
        "https://aurifyimage.s3.ap-south-1.amazonaws.com/1744013531086-swiss.webp",
      serviceEmail: adminInfo.serviceEmail,
      _id: adminId?.toString(), // Convert ObjectId to string to avoid serialization issues
    };

    // Prepare orderData for OrderStatusService - clean object without session references
    const orderData = {
      _id: updatedOrder._id.toString(),
      transactionId: updatedOrder.transactionId || updatedOrder._id.toString(),
      paymentMethod: updatedOrder.paymentMethod || "N/A",
      totalWeight: Number(updatedOrder.totalWeight) || 0,
      totalPrice: Number(updatedOrder.totalPrice) || 0,
      createdAt: updatedOrder.createdAt || new Date(),
      items: updatedOrder.items.map((item) => ({
        productId:
          item.productId?._id?.toString() || item.productId?.toString(),
        productName:
          item.productId?.title || item.productName || "Unknown Product",
        productWeight: Number(
          item.productId?.weight || item.productWeight || 0
        ),
        quantity: Number(item.quantity) || 1,
        fixedPrice: Number(item.productId?.price || item.fixedPrice || 0),
        totalPrice:
          (Number(item.quantity) || 1) *
          Number(item.productId?.price || item.fixedPrice || 0),
        makingCharge: Number(item.makingCharge) || 0,
      })),
      userId: updatedOrder.userId.toString(),
      adminId: adminId?.toString() || "", // Convert to string
    };

    // Prepare userData for OrderStatusService - clean object
    const userData = {
      users: [
        {
          _id: currentUser._id.toString(),
          name: currentUser.name || `Customer ${userId.toString().slice(-5)}`,
          email: currentUser.email || "",
          cashBalance: Number(currentUser.cashBalance) || 0,
          goldBalance: Number(currentUser.goldBalance) || 0,
        },
      ],
    };

    // Map orderStatus to OrderStatusService methods
    const statusMap = {
      Approved: "approvel",
      Processing: "processing",
      "User Approval Pending": "user_approvel_pending",
      Success: "scusess",
      Rejected: "reject",
    };

    const statusType = statusMap[orderStatus];
    if (!statusType) {
      await session.abortTransaction();
      session.endSession();
      return {
        success: false,
        message: `Unsupported order status: ${orderStatus}`,
      };
    }

    // Additional data for notifications/emails - clean object
    const additionalData = {
      orderNote:
        orderStatus === "Rejected"
          ? "Order was rejected by request"
          : undefined,
      rejectionReason:
        orderStatus === "Rejected" ? "Order rejection requested" : undefined,
      estimatedCompletion:
        orderStatus === "Processing"
          ? "Estimated completion in 2-3 business days"
          : undefined,
      deliveryDate:
        orderStatus === "Success"
          ? new Date().toLocaleDateString("en-AE")
          : undefined,
      isWarning: orderStatus === "User Approval Pending" ? "true" : "false",
    };

    // Initialize OrderStatusService
    const orderStatusService = new OrderStatusService();

    // Send notifications and emails after status update
    // IMPORTANT: Do this OUTSIDE the transaction to avoid session serialization issues
    let notificationResult = {
      success: true,
      message: "Notifications will be sent after transaction",
    };

    // Handle balance updates and transactions for Approved status
    if (orderStatus === "Approved") {
      const totalAmount = Number(updatedOrder.totalPrice);
      const totalWeight = Number(updatedOrder.totalWeight);

      if (isNaN(totalAmount) || isNaN(totalWeight)) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          message:
            "Invalid order amounts: totalAmount or totalWeight is not a number",
        };
      }

      let updateOperation = {};
      let transactions = [];
      let transactionNotificationMessages = [];

      if (updatedOrder.paymentMethod === "Cash") {
        const currentCashBalance = Number(currentUser.cashBalance) || 0;
        const newCashBalance = currentCashBalance - totalAmount;

        updateOperation = {
          "users.$.cashBalance": newCashBalance,
        };

        // Create clean transaction objects without session references
        transactions.push({
          userId: new mongoose.Types.ObjectId(userId),
          type: "DEBIT",
          method: "CASH",
          amount: totalAmount,
          balanceType: "CASH",
          balanceAfter: newCashBalance,
          orderId: new mongoose.Types.ObjectId(orderId),
          createdAt: new Date(),
        });

        transactionNotificationMessages.push(
          `A cash payment of ${totalAmount.toFixed(
            2
          )} has been processed for your order #${orderId
            .toString()
            .slice(-6)}. Your new cash balance is ${newCashBalance.toFixed(2)}.`
        );
      } else if (
        updatedOrder.paymentMethod === "Gold To Gold" ||
        updatedOrder.paymentMethod === "Gold"
      ) {
        let totalMakingCharge = 0;
        if (updatedOrder.items && Array.isArray(updatedOrder.items)) {
          totalMakingCharge = updatedOrder.items.reduce((sum, item) => {
            return (
              sum + Number(item.makingCharge || 0) * Number(item.quantity || 1)
            );
          }, 0);
        }

        const currentGoldBalance = Number(currentUser.goldBalance) || 0;
        const newGoldBalance = currentGoldBalance - totalWeight;

        const currentCashBalance = Number(currentUser.cashBalance) || 0;
        const newCashBalance = currentCashBalance - totalMakingCharge;

        updateOperation = {
          "users.$.goldBalance": newGoldBalance,
          "users.$.cashBalance": newCashBalance,
        };

        // Create clean transaction objects
        transactions.push({
          userId: new mongoose.Types.ObjectId(userId),
          type: "DEBIT",
          method: "GOLD_TO_GOLD",
          amount: totalWeight,
          balanceType: "GOLD",
          balanceAfter: newGoldBalance,
          orderId: new mongoose.Types.ObjectId(orderId),
          createdAt: new Date(),
        });

        if (totalMakingCharge > 0) {
          transactions.push({
            userId: new mongoose.Types.ObjectId(userId),
            type: "DEBIT",
            method: "CASH",
            amount: totalMakingCharge,
            balanceType: "CASH",
            balanceAfter: newCashBalance,
            orderId: new mongoose.Types.ObjectId(orderId),
            description: "Making charges for gold order",
            createdAt: new Date(),
          });
        }

        transactionNotificationMessages.push(
          `A gold payment of ${totalWeight.toFixed(
            3
          )} grams has been processed for your order #${orderId
            .toString()
            .slice(-6)}. Your new gold balance is ${newGoldBalance.toFixed(
            3
          )} grams.`
        );

        if (totalMakingCharge > 0) {
          transactionNotificationMessages.push(
            `A cash payment of ${totalMakingCharge.toFixed(
              2
            )} for making charges has been processed for your order #${orderId
              .toString()
              .slice(-6)}. Your new cash balance is ${newCashBalance.toFixed(
              2
            )}.`
          );
        }
      }

      // Update user balances
      if (Object.keys(updateOperation).length > 0) {
        await UsersModel.updateOne(
          { "users._id": userId },
          { $set: updateOperation }
        ).session(session);
      }

      // Insert transactions
      if (transactions.length > 0) {
        await TransactionModel.insertMany(transactions, { session });
      }

      // Add transaction notifications to in-app notifications
      const addNotification = async (userId, message) => {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
          console.error("Invalid userId for notification:", userId);
          throw new Error("Invalid userId for notification");
        }
        try {
          let notification = await userNotification
            .findOne({ createdBy: userId })
            .session(session);

          const notificationData = {
            message,
            read: false,
            createdAt: new Date(),
            type: `transaction_${orderStatus.toLowerCase()}`,
          };

          if (notification) {
            notification.notification.push(notificationData);
            await notification.save({ session });
          } else {
            const newNotification = new userNotification({
              notification: [notificationData],
              createdBy: userId,
            });
            await newNotification.save({ session });
          }
        } catch (err) {
          console.error("Error creating notification:", err);
          throw err;
        }
      };

      for (const message of transactionNotificationMessages) {
        await addNotification(userId, message);
      }
    }

    // Commit the transaction BEFORE sending notifications
    await session.commitTransaction();
    session.endSession();

    // NOW send notifications OUTSIDE the transaction to avoid session serialization
    try {
      notificationResult = await orderStatusService.sendOrderStatusUpdates(
        orderData,
        userData,
        adminData,
        statusType,
        additionalData
      );

      if (!notificationResult.success) {
        console.warn(
          `Notification/email sending partially failed: ${notificationResult.message}`
        );
      } else {
        console.log(
          `Notifications sent successfully: ${JSON.stringify(
            notificationResult
          )}`
        );
      }
    } catch (notificationError) {
      console.error(
        "Error sending notifications (order update still successful):",
        notificationError
      );
      notificationResult = {
        success: false,
        message: `Order updated successfully but notifications failed: ${notificationError.message}`,
        error: notificationError.message,
      };
    }

    return {
      success: true,
      message: "Order status updated successfully",
      data: {
        _id: updatedOrder._id,
        orderStatus: updatedOrder.orderStatus,
        transactionId: updatedOrder.transactionId,
        totalPrice: updatedOrder.totalPrice,
        totalWeight: updatedOrder.totalWeight,
        paymentMethod: updatedOrder.paymentMethod,
        userId: updatedOrder.userId,
        createdAt: updatedOrder.createdAt,
        updatedAt: new Date(),
      },
      notificationResult, // Include notification result for debugging
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error updating order and balances:", error);
    return {
      success: false,
      message: "Error updating order: " + error.message,
      error: error.stack,
    };
  }
};

export const rejectItemInOrder = async (
  orderId,
  itemId,
  rejectionReason = "",
  userId = null
) => {
  try {
    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return {
        success: false,
        message: "Invalid Order ID or Item ID format",
      };
    }

    // Find the order and populate product details
    const order = await orderModel.findById(orderId).populate({
      path: "items.productId",
      select: "title description images price weight purity sku",
    });

    if (!order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    // Extract userId from order if not provided
    const targetUserId = userId || order.userId;
    if (!targetUserId) {
      return {
        success: false,
        message: "User ID not found in order or provided",
      };
    }

    // Find the specific item
    const itemIndex = order.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return {
        success: false,
        message: "Item not found in the order",
      };
    }

    // Store original values for reference and comparison
    const originalItem = { ...order.items[itemIndex].toObject() };
    const previousOrderStatus = order.orderStatus;

    // Update the item status to rejected
    order.items[itemIndex].itemStatus = "Rejected";

    // Set the select property to true for the rejected item
    order.items[itemIndex].select = true;

    // Add rejection reason to the item if provided
    if (rejectionReason) {
      order.items[itemIndex].rejectionReason = rejectionReason;
      if (!order.orderRemark) {
        order.orderRemark = rejectionReason;
      }
    }

    // Recalculate the total price by excluding the rejected item
    const rejectedItemPrice =
      order.items[itemIndex].fixedPrice * order.items[itemIndex].quantity;
    order.totalPrice = Math.max(0, order.totalPrice - rejectedItemPrice);

    // Calculate and update totalWeight
    const weightToSubtract =
      order.items[itemIndex].productWeight * order.items[itemIndex].quantity;
    order.totalWeight = Math.max(0, order.totalWeight - weightToSubtract);

    // Determine new order status using the helper function
    const newOrderStatus = determineOrderStatusFromItems(order.items);
    const statusChanged = order.orderStatus !== newOrderStatus;
    order.orderStatus = newOrderStatus;

    // Track what was changed
    const changes = {
      statusChanged,
      itemRejected: true,
      rejectionReason: rejectionReason || null,
    };

    // Save the updated order
    await order.save();

    // Log the changes with proper product name
    console.log(`❌ Order ${orderId} item rejected:`, {
      itemId,
      userId: targetUserId,
      changes,
      previousStatus: previousOrderStatus,
      newStatus: order.orderStatus,
      rejectedItem: {
        name: order.items[itemIndex].productId?.title || "Unknown Product",
        quantity: order.items[itemIndex].quantity,
        price: order.items[itemIndex].fixedPrice,
      },
      rejectionReason,
    });

    // ENHANCED: Send "rejected" notifications when item is rejected
    let notificationResult = null;

    try {
      console.log("📧 Sending item rejection notifications...");

      // Send "rejected" notification using OrderStatusService
      notificationResult = await sendItemRejectionNotifications(
        order,
        targetUserId,
        {
          itemId,
          orderId,
          changes,
          previousOrderStatus,
          newOrderStatus,
          originalItem,
          rejectedItem: order.items[itemIndex],
          userAction: "rejected",
          rejectionTimestamp: new Date(),
          rejectionReason,
          // Item-specific details for notifications
          itemDetails: {
            productName:
              order.items[itemIndex].productId?.title || "Unknown Product",
            quantity: order.items[itemIndex].quantity || 1,
            price: order.items[itemIndex].fixedPrice || 0,
            weight: order.items[itemIndex].productWeight || 0,
          },
        }
      );
    } catch (notificationError) {
      console.error("❌ Error in notification process:", notificationError);
      // Continue execution - don't fail the rejection due to notification errors
    }

    // Add local notification to user notification model
    await addLocalNotificationForRejection(
      order,
      targetUserId,
      itemId,
      previousOrderStatus,
      newOrderStatus,
      rejectionReason
    );

    return {
      success: true,
      data: order,
      message: "Item rejected successfully",
      rejectedItem: order.items[itemIndex],
      originalItem: originalItem,
      changes,
      notificationResult,
      statusTransition: {
        from: previousOrderStatus,
        to: newOrderStatus,
      },
    };
  } catch (error) {
    console.error("Error rejecting item:", error);
    return {
      success: false,
      message: error.message || "Internal server error",
      error: error.name,
    };
  }
};

// Helper function to determine order status from items (same as in rejectOrderItemHelper)
const determineOrderStatusFromItems = (items) => {
  if (!items || items.length === 0) return "Processing";

  const allApproved = items.every((item) => item.itemStatus === "Approved");
  const anyUserApprovalPending = items.some(
    (item) => item.itemStatus === "User Approval Pending"
  );
  const anyRejected = items.some((item) => item.itemStatus === "Rejected");
  const approvedItems = items.filter((item) => item.itemStatus === "Approved");

  if (allApproved) return "Pending"; // All items approved, ready for processing
  if (anyUserApprovalPending) return "User Approval Pending";
  if (anyRejected && approvedItems.length > 0) return "Partially Processed";
  if (items.every((item) => item.itemStatus === "Rejected")) return "Cancelled";
  return "Processing";
};

// Data preparation helper functions (same as in rejectOrderItemHelper)
const prepareOrderDataForNotification = (order, adminId) => ({
  _id: order._id.toString(),
  transactionId: order.transactionId || order._id.toString(),
  paymentMethod: order.paymentMethod || "N/A",
  totalWeight: Number(order.totalWeight) || 0,
  totalPrice: Number(order.totalPrice) || 0,
  createdAt: order.createdAt || new Date(),
  orderStatus: order.orderStatus,
  items: order.items.map((item) => ({
    _id: item._id.toString(),
    productId:
      item.productId?._id?.toString() || item.productId?.toString() || "",
    productName: item.productId?.title || "Unknown Product",
    productWeight: Number(item.productWeight) || 0,
    quantity: Number(item.quantity) || 1,
    fixedPrice: Number(item.fixedPrice) || 0,
    totalPrice: (Number(item.quantity) || 1) * (Number(item.fixedPrice) || 0),
    itemStatus: item.itemStatus || "Pending",
    makingCharge: Number(item.makingCharge) || 0,
    rejectionReason: item.rejectionReason || null,
  })),
  userId: order.userId.toString(),
  adminId: adminId?.toString() || "",
});

const prepareUserDataForNotification = (user, userId) => ({
  users: [
    {
      _id: user._id?.toString() || userId.toString(),
      name: user.name || `Customer ${userId.toString().slice(-5)}`,
      email: user.email || "",
      contact: user.contact || "",
      address: user.address || "",
      cashBalance: Number(user.cashBalance) || 0,
      goldBalance: Number(user.goldBalance) || 0,
    },
  ],
});

const prepareAdminDataForNotification = (adminInfo, adminId) => ({
  companyName: adminInfo?.companyName || "Aurify",
  email: adminInfo?.email || "info@aurify.ae",
  contact: adminInfo?.contact || "+971-XXX-XXXX",
  logo:
    adminInfo?.logo ||
    "https://aurifyimage.s3.ap-south-1.amazonaws.com/1744013531086-swiss.webp",
  _id: adminId?.toString() || "",
  serviceEmail: adminInfo?.serviceEmail || adminInfo?.email || "info@aurify.ae",
});

// Item rejection notification function using OrderStatusService (same as in rejectOrderItemHelper)
const sendItemRejectionNotifications = async (
  order,
  userId,
  additionalData
) => {
  try {
    console.log("🔔 Preparing item rejection notifications...");

    // Fetch user data with admin reference
    const userData = await UsersModel.findOne(
      { "users._id": userId },
      { "users.$": 1, createdBy: 1 }
    ).lean();

    if (!userData || !userData.users.length) {
      console.warn(`❌ User not found for userId: ${userId}`);
      return {
        success: false,
        message: "User data not found for notifications",
      };
    }

    // Extract adminId from user data
    const adminId = userData.createdBy;
    if (!adminId) {
      console.warn(`❌ Admin ID not found for user: ${userId}`);
      return {
        success: false,
        message: "Admin ID not found for user",
      };
    }

    // Fetch admin data
    const adminInfo = await adminModel.findOne({ _id: adminId }).lean();
    if (!adminInfo) {
      console.warn(`❌ Admin not found for adminId: ${adminId}`);
      return {
        success: false,
        message: "Admin data not found for notifications",
      };
    }

    // Prepare data for OrderStatusService - using "item_rejected" status type
    const orderData = prepareOrderDataForNotification(order, adminId);
    const preparedUserData = prepareUserDataForNotification(
      userData.users[0],
      userId
    );
    const adminData = prepareAdminDataForNotification(adminInfo, adminId);

    // IMPORTANT: Use "item_rejected" status type for item rejections to match configs
    const statusType = "item_rejected";

    console.log(
      `📧 Sending "${statusType}" notification for rejected item - Order Status: ${order.orderStatus}`
    );

    // Enhanced additional data for notifications
    const enhancedAdditionalData = {
      ...additionalData,
      // Item rejection specific data
      rejectionType: "item_rejected",
      rejectedByUser: true,
      rejectionTimestamp: new Date(),
      rejectionReason: additionalData.rejectionReason || "No reason provided",
      // Custom message for item rejection
      customMessage: `Your item "${
        additionalData.itemDetails?.productName ||
        additionalData.rejectedItem?.productId?.title ||
        "Unknown Product"
      }" has been rejected. ${
        additionalData.rejectionReason
          ? "Reason: " + additionalData.rejectionReason
          : ""
      }`,
      actionType: "item_rejection_completed",
      // Item-specific details with fallbacks
      itemDetails: {
        ...additionalData.itemDetails,
        productName:
          additionalData.itemDetails?.productName ||
          additionalData.rejectedItem?.productId?.title ||
          "Unknown Product",
        quantity:
          additionalData.itemDetails?.quantity ||
          additionalData.rejectedItem?.quantity ||
          1,
        price:
          additionalData.itemDetails?.price ||
          additionalData.rejectedItem?.fixedPrice ||
          0,
        weight:
          additionalData.itemDetails?.weight ||
          additionalData.rejectedItem?.productWeight ||
          0,
        totalValue:
          (additionalData.itemDetails?.quantity ||
            additionalData.rejectedItem?.quantity ||
            1) *
          (additionalData.itemDetails?.price ||
            additionalData.rejectedItem?.fixedPrice ||
            0),
      },
      // Email template customization
      emailSubjectSuffix: "- Item Rejected",
      // Push notification customization with fallbacks
      pushNotificationTitle: "❌ Item Rejected",
      pushNotificationBody: `Your item "${
        additionalData.itemDetails?.productName ||
        additionalData.rejectedItem?.productId?.title ||
        "Unknown Product"
      }" has been rejected for order #${order.transactionId}${
        additionalData.rejectionReason
          ? ". Reason: " + additionalData.rejectionReason
          : ""
      }`,
    };

    // Send notifications using OrderStatusService with "item_rejected" type
    const orderStatusService = new OrderStatusService();
    const notificationResult = await orderStatusService.sendOrderStatusUpdates(
      orderData,
      preparedUserData,
      adminData,
      statusType, // Use "item_rejected" for item rejections
      enhancedAdditionalData
    );

    if (notificationResult.success) {
      console.log(
        `✅ Item rejection notifications sent successfully with type: "${statusType}"`
      );
      console.log(`📊 Notification Results:`, {
        email: notificationResult.results?.email?.success || false,
        push: notificationResult.results?.notifications?.success || false,
        processId: notificationResult.processId,
      });
    } else {
      console.warn(
        `⚠️ Item rejection notifications partially failed: ${notificationResult.message}`
      );
    }

    return notificationResult;
  } catch (notificationError) {
    console.error(
      "❌ Error sending item rejection notifications:",
      notificationError
    );
    return {
      success: false,
      message:
        "Item rejection notifications failed: " + notificationError.message,
      error: notificationError.name,
      statusType: "item_rejected",
    };
  }
};

// Enhanced local notification function for item rejection (same as in rejectOrderItemHelper)
const addLocalNotificationForRejection = async (
  order,
  userId,
  itemId,
  previousStatus,
  newStatus,
  rejectionReason = ""
) => {
  try {
    // Always create notification for item rejection, even if order status hasn't changed
    let notificationMessage = "";
    let notificationType = "Rejected";

    // Find the rejected item details
    const rejectedItem = order.items.find(
      (item) => item._id.toString() === itemId
    );
    const itemName = rejectedItem?.productId?.title || "Unknown Item";

    // Create item-specific rejection notification
    notificationMessage = `❌ Item "${itemName}" rejected! Your order #${order.transactionId} item has been rejected.`;

    if (rejectionReason) {
      notificationMessage += ` Reason: ${rejectionReason}`;
    }

    // Add additional context based on order status
    if (newStatus !== previousStatus) {
      switch (newStatus) {
        case "Cancelled":
          notificationMessage +=
            " Your entire order has been cancelled as all items were rejected.";
          notificationType = "Cancelled";
          break;
        case "Partially Processed":
          notificationMessage +=
            " Your order will continue with the remaining approved items.";
          notificationType = "Warning";
          break;
        case "User Approval Pending":
          notificationMessage +=
            " Other items are still pending your approval.";
          break;
        case "Processing":
          notificationMessage +=
            " Your order is now being processed with approved items.";
          break;
        default:
          notificationMessage += ` Order status: ${newStatus}`;
      }
    } else {
      notificationMessage += " Other items may still be pending approval.";
    }

    // Find existing user notification document or create a new one
    let userNotificationDoc = await userNotification.findOne({
      createdBy: userId,
    });

    const newNotification = {
      message: notificationMessage,
      read: false,
      createdAt: new Date(),
      orderId: order._id,
      itemId: itemId,
      type: notificationType,
      metadata: {
        action: "item_rejection",
        previousOrderStatus: previousStatus,
        newOrderStatus: newStatus,
        transactionId: order.transactionId,
        itemName: itemName,
        rejectionReason: rejectionReason || null,
        priority: "high",
      },
    };

    if (userNotificationDoc) {
      // Add notification to existing document
      userNotificationDoc.notification.push(newNotification);
      await userNotificationDoc.save();
    } else {
      // Create new notification document
      userNotificationDoc = new userNotification({
        notification: [newNotification],
        createdBy: userId,
      });
      await userNotificationDoc.save();
    }

    console.log(
      `✅ Local notification added for user ${userId} - Item: ${itemName}, Status: ${newStatus}, Reason: ${
        rejectionReason || "None"
      }`
    );
  } catch (notificationError) {
    console.error(
      "❌ Error creating local notification:",
      notificationError.message
    );
    // Continue processing - notification failure shouldn't stop the order update
  }
};

export const updateOrderStatusHelper = async (orderId, orderDetails) => {
  try {
    const { orderStatus, remark } = orderDetails;

    // Ensure the order status is being set correctly, including rejection scenario
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId, // Correct query syntax
      {
        orderStatus,
        orderRemark: remark, // Correct way to update remark field
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    return {
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error updating order: " + error.message,
    };
  }
};

export const updateOrderQuantityHelper = async (
  orderId,
  adminId,
  orderDetails
) => {
  try {
    let { itemStatus, itemId, quantity, fixedPrice } = orderDetails;

    // Input validation
    if (!orderId || !adminId || !itemId) {
      return {
        success: false,
        message: "Missing required parameters: orderId, adminId, or itemId",
      };
    }

    // Set default quantity to 1 if none provided or quantity is invalid (less than 1)
    if (!quantity || quantity < 1) {
      quantity = 1;
    }

    // Validate fixedPrice
    if (fixedPrice !== undefined && (fixedPrice < 0 || isNaN(fixedPrice))) {
      return {
        success: false,
        message: "Invalid fixed price provided",
      };
    }

    // Find the order by ID with better error handling
    const order = await orderModel.findById(orderId);
    if (!order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    // Find the item inside the order's items array
    const itemIndex = order.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return {
        success: false,
        message: "Item not found in the order",
      };
    }

    // Store previous values for comparison and logging
    const previousStatus = order.orderStatus;
    const previousQuantity = order.items[itemIndex].quantity;
    const previousPrice = order.items[itemIndex].fixedPrice;

    // Update the specific item's properties
    order.items[itemIndex].quantity = quantity;
    if (fixedPrice !== undefined) {
      order.items[itemIndex].fixedPrice = fixedPrice;
    }
    if (itemStatus) {
      order.items[itemIndex].itemStatus = itemStatus;
    }

    // Recalculate total price for the order
    order.totalPrice = order.items.reduce(
      (total, item) => total + (item.quantity || 0) * (item.fixedPrice || 0),
      0
    );

    // Determine new order status based on item statuses
    const newOrderStatus = determineOrderStatus(order.items);
    const statusChanged = order.orderStatus !== newOrderStatus;

    if (statusChanged) {
      order.orderStatus = newOrderStatus;
      // Set notification timestamp for User Approval Pending
      if (newOrderStatus === "User Approval Pending") {
        order.notificationSentAt = new Date();
      }
    }

    // Save the updated order
    await order.save();

    // Log the changes for debugging
    console.log(`Order ${orderId} updated:`, {
      itemId,
      quantityChanged: previousQuantity !== quantity,
      priceChanged: previousPrice !== (fixedPrice || previousPrice),
      statusChanged,
      previousStatus,
      newStatus: order.orderStatus,
    });

    // Send notifications if status changed or if it's a significant update
    const shouldSendNotification =
      statusChanged ||
      (previousQuantity !== quantity &&
        (itemStatus === "Approved" || itemStatus === "User Approval Pending"));

    if (shouldSendNotification) {
      const notificationResult = await sendOrderNotifications(order, adminId, {
        quantity,
        itemId,
        orderId,
        quantityChanged: previousQuantity !== quantity,
        priceChanged: previousPrice !== (fixedPrice || previousPrice),
        previousStatus,
        isQuantityUpdate: true,
        statusChanged,
      });

      return {
        success: true,
        message: statusChanged
          ? "Order updated successfully and notifications sent"
          : "Order updated successfully with notifications",
        data: order,
        changes: {
          statusChanged,
          quantityChanged: previousQuantity !== quantity,
          priceChanged: previousPrice !== (fixedPrice || previousPrice),
        },
        notificationResult,
      };
    }

    // If no notifications needed, just return success
    return {
      success: true,
      message: "Order updated successfully",
      data: order,
      changes: {
        statusChanged: false,
        quantityChanged: previousQuantity !== quantity,
        priceChanged: previousPrice !== (fixedPrice || previousPrice),
      },
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      success: false,
      message: "Error updating order: " + error.message,
      error: error.name,
    };
  }
};

// Helper function to determine order status based on item statuses
const determineOrderStatus = (items) => {
  if (!items || items.length === 0) return "Processing";

  const allApproved = items.every((item) => item.itemStatus === "Approved");
  const anyUserApprovalPending = items.some(
    (item) => item.itemStatus === "User Approval Pending"
  );
  const anyRejected = items.some((item) => item.itemStatus === "Rejected");

  if (allApproved) return "Success";
  if (anyRejected) return "Rejected";
  if (anyUserApprovalPending) return "User Approval Pending";
  return "Processing";
};

// Extracted notification logic for better maintainability
const sendOrderNotifications = async (order, adminId, additionalData) => {
  try {
    // Fetch user data
    const userData = await UsersModel.findOne(
      { "users._id": order.userId },
      { "users.$": 1 }
    ).lean();

    if (!userData || !userData.users.length) {
      console.warn(`User not found for userId: ${order.userId}`);
      return {
        success: false,
        message: "User data not found for notifications",
      };
    }

    // Fetch admin data
    const adminInfo = await adminModel.findOne({ _id: adminId }).lean();
    if (!adminInfo) {
      console.warn(`Admin not found for adminId: ${adminId}`);
      return {
        success: false,
        message: "Admin data not found for notifications",
      };
    }

    // Prepare clean data objects for OrderStatusService
    const orderData = prepareOrderData(order, adminId);
    const preparedUserData = prepareUserData(userData.users[0], order.userId);
    const adminData = prepareAdminData(adminInfo, adminId);

    // Map orderStatus to OrderStatusService methods
    const statusMap = {
      Success: "scusess",
      "User Approval Pending": "user_approvel_pending",
      Processing: "processing",
      Approved: "approvel",
      Rejected: "reject",
    };

    const statusType = statusMap[order.orderStatus];
    if (!statusType) {
      console.warn(
        `No notification handler found for status: ${order.orderStatus}`
      );
      return {
        success: false,
        message: `No notification handler for status: ${order.orderStatus}`,
      };
    }

    // Enhanced additional data based on status
    const enhancedAdditionalData = {
      ...additionalData,
      // Status-specific enhancements
      ...(order.orderStatus === "User Approval Pending" && {
        pendingReason: `Quantity updated to ${additionalData.quantity} for item requiring your confirmation`,
        isWarning: "true",
        actionRequired: true,
      }),
      ...(order.orderStatus === "Success" && {
        deliveryDate: new Date().toLocaleDateString("en-AE"),
        completionNote: "All items approved and order completed successfully",
      }),
    };

    // Initialize OrderStatusService and send notifications
    const orderStatusService = new OrderStatusService();
    const notificationResult = await orderStatusService.sendOrderStatusUpdates(
      orderData,
      preparedUserData,
      adminData,
      statusType,
      enhancedAdditionalData
    );

    if (notificationResult.success) {
      console.log(
        `✅ Order status notifications sent successfully for ${statusType}`
      );
    } else {
      console.warn(
        `⚠️ Order status notifications partially failed: ${notificationResult.message}`
      );
    }

    return notificationResult;
  } catch (notificationError) {
    console.error("Error sending notifications:", notificationError);
    return {
      success: false,
      message: "Notifications failed: " + notificationError.message,
      error: notificationError.name,
    };
  }
};

// Helper functions for data preparation
const prepareOrderData = (order, adminId) => ({
  _id: order._id.toString(),
  transactionId: order.transactionId || order._id.toString(),
  paymentMethod: order.paymentMethod || "N/A",
  totalWeight: Number(order.totalWeight) || 0,
  totalPrice: Number(order.totalPrice) || 0,
  createdAt: order.createdAt || new Date(),
  items: order.items.map((item) => ({
    _id: item._id.toString(),
    productId: item.productId?.toString() || "",
    productName: item.productName || "Unknown Product",
    productWeight: Number(item.productWeight) || 0,
    quantity: Number(item.quantity) || 1,
    fixedPrice: Number(item.fixedPrice) || 0,
    totalPrice: (Number(item.quantity) || 1) * (Number(item.fixedPrice) || 0),
    itemStatus: item.itemStatus || "Pending",
    makingCharge: Number(item.makingCharge) || 0,
  })),
  userId: order.userId.toString(),
  adminId: adminId?.toString() || "",
});

const prepareUserData = (user, userId) => ({
  users: [
    {
      _id: user._id.toString(),
      name: user.name || `Customer ${userId.toString().slice(-5)}`,
      email: user.email || "",
      cashBalance: Number(user.cashBalance) || 0,
      goldBalance: Number(user.goldBalance) || 0,
    },
  ],
});

const prepareAdminData = (adminInfo, adminId) => ({
  companyName: adminInfo?.companyName || "Aurify",
  email: adminInfo?.email || "info@aurify.ae",
  contact: adminInfo?.contact || "+971-XXX-XXXX",
  logo:
    adminInfo?.logo ||
    "https://aurifyimage.s3.ap-south-1.amazonaws.com/1744013531086-swiss.webp",
  _id: adminId?.toString() || "",
  serviceEmail: adminInfo?.serviceEmail || adminInfo?.email,
});

const sendQuantityConfirmationEmail = async (orderId, itemId, quantity) => {
  try {
    // Find the order with proper population
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Now populate the userId with proper fields
    // Based on your schema, Users is an array inside a document
    const userData = await UsersModel.findOne(
      { "users._id": order.userId },
      { "users.$": 1 }
    );

    if (!userData || !userData.users || userData.users.length === 0) {
      throw new Error("User data not found");
    }

    const user = userData.users[0];
    const userEmail = user.email;
    const userName = user.name;

    // Find the specific item in the order
    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      throw new Error("Item not found in order");
    }

    // Get product details by querying the Product model directly
    const product = await mongoose.model("Product").findById(item.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const productName = product.name || "Product";
    const productWeight = product.weight || 0;
    const totalWeight = productWeight * quantity;

    const admin = await adminModel.findById(order.adminId);
    const adminBrandName =
      admin && admin.companyName ? admin.companyName : "Aurify";

    // Configure base URLs for action buttons
    const baseUrl = "https://novaemail.netlify.app";
    const approveUrl = `${baseUrl}/confirm-quantity?orderId=${orderId}&itemId=${itemId}&action=true`;
    const rejectUrl = `${baseUrl}/confirm-quantity?orderId=${orderId}&itemId=${itemId}&action=false`;

    // Email configuration
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Format price with comma separators for Indian Rupees
    const formattedPrice = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(item.fixedPrice);

    // Email content with enhanced MJML
    const mailOptions = {
      from: `"${adminBrandName} Precious Metals" <aurifycontact@gmail.com>`,
      to: userEmail,
      subject: `🌟 Exclusive Order Quantity Confirmation - ${adminBrandName}`,
      html: mjml2html(`
        <mjml>
          <mj-head>
            <mj-title>Order Quantity Confirmation - ${adminBrandName}</mj-title>
            <mj-attributes>
              <mj-all font-family="'Optima', 'Palatino Linotype', serif" />
            </mj-attributes>
            <mj-style inline="inline">
              .gold-gradient {
                background: linear-gradient(135deg, #D4AF37 0%, #C9B037 50%, #A47551 100%);
                color: #FFFFFF;
              }
              .metallic-border {
                border: 2px solid #D4AF37;
                border-radius: 15px;
              }
              .luxury-shadow {
                box-shadow: 0 15px 30px rgba(212, 175, 55, 0.2);
              }
              .elegant-table tr {
                border-bottom: 1px solid rgba(212, 175, 55, 0.2);
              }
              .elegant-table td {
                padding: 12px 15px;
                color: #2C3E50;
              }
                
            </mj-style>
          </mj-head>
          
          <mj-body background-color="#F7F3E8">
            <!-- Luxurious Header -->
            <mj-section css-class="gold-gradient" padding="40px 20px">
              <mj-column>
                <mj-text font-size="28px" font-weight="bold" align="center" color="#FFFFFF" letter-spacing="2px">
                  Order Quantity Confirmation
                </mj-text>
                <mj-text font-size="16px" align="center" color="#F0E68C" padding-top="10px">
                  ${adminBrandName} Precious Metals Collection
                </mj-text>
              </mj-column>
            </mj-section>

            <!-- Main Content Area -->
            <mj-section background-color="#FFFFFF" css-class="metallic-border luxury-shadow" padding="30px" margin="20px">
              <mj-column>
                <!-- Personalized Greeting -->
                <mj-text font-size="20px" font-weight="bold" color="#2C3E50" padding-bottom="20px">
                  Dear ${userName},
                </mj-text>

                <mj-text font-size="16px" color="#34495E" line-height="1.6">
                  We are reaching out regarding a refined adjustment to your recent order of precious metals with ${adminBrandName}.
                </mj-text>

                <!-- Attention Grabbing Notice -->
                <mj-section background-color="#FFF5E6" border-radius="10px" padding="15px" margin="20px 0">
                  <mj-column>
                    <mj-text font-size="18px" font-weight="bold" color="#D4AF37" align="center">
                      🔔 Order Quantity Update Required
                    </mj-text>
                    <mj-text font-size="16px" color="#2C3E50" align="center">
                      Your original order of 1 item requires an adjustment to <span style="color: #D4AF37; font-weight: bold;">${quantity} items</span>
                    </mj-text>
                  </mj-column>
                </mj-section>

                <!-- Detailed Order Information -->
                <mj-text font-size="20px" font-weight="bold" color="#2C3E50" padding-top="20px" padding-bottom="15px">
                  Order Details
                </mj-text>

                <mj-table css-class="elegant-table" font-size="16px" width="100%">
                  <tr>
                    <td style="width: 50%; font-weight: bold;">Product</td>
                    <td style="text-align: right; font-weight: bold; color: #D4AF37;">${productName}</td>
                  </tr>
                  <tr>
                    <td>Order Number</td>
                    <td style="text-align: right;">${order.transactionId}</td>
                  </tr>
                  <tr>
                    <td>Original Quantity</td>
                    <td style="text-align: right;">1</td>
                  </tr>
                  <tr>
                    <td>Updated Quantity</td>
                    <td style="text-align: right; color: #D4AF37; font-weight: bold;">${quantity}</td>
                  </tr>
                  <tr>
                    <td>Price Per Unit</td>
                    <td style="text-align: right;">AED ${formattedPrice}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Total Investment</td>
                    <td style="text-align: right; font-weight: bold; color: #2C3E50;">
                      AED ${new Intl.NumberFormat("en-IN", {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      }).format(item.fixedPrice * quantity)}
                    </td>
                  </tr>
                </mj-table>

                <!-- Action Buttons -->
                <mj-section padding-top="30px">
                  <mj-column>
                    <mj-button background-color="#D4AF37" color="#FFFFFF" href="${approveUrl}" font-size="16px" border-radius="10px" padding="15px 30px">
                      ✓ Confirm Quantity
                    </mj-button>
                  </mj-column>
                  <mj-column>
                    <mj-button background-color="#2C3E50" color="#FFFFFF" href="${rejectUrl}" font-size="16px" border-radius="10px" padding="15px 30px">
                      ✗ Decline Changes
                    </mj-button>
                  </mj-column>
                </mj-section>

                <!-- Support Information -->
                <mj-text font-size="14px" color="#7F8C8D" align="center" padding-top="20px">
                  Need Assistance? Contact our Precious Metals Concierge
                  <br/>
                  📞 + ${admin.contact}| ✉️ ${admin.email}
                </mj-text>
              </mj-column>
            </mj-section>

            <!-- Elegant Footer -->
            <mj-section background-color="#2C3E50" padding="20px">
              <mj-column>
                <mj-text color="#FFFFFF" font-size="12px" align="center">
                  © ${new Date().getFullYear()} ${adminBrandName} Precious Metals. All Rights Reserved.
                  <br/>
                  Crafting Excellence in Gold and Silver
                </mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `).html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Quantity confirmation email sent:", info.messageId);

    return {
      success: true,
      message: "Quantity confirmation email sent successfully",
    };
  } catch (error) {
    console.error("Error sending quantity confirmation email:", error);
    return {
      success: false,
      message: "Error sending quantity confirmation email",
      error: error.message,
    };
  }
};

export const fetchBookingDetails = async (adminId) => {
  try {
    // Input validation
    if (!adminId) {
      return {
        success: false,
        message: "Missing admin ID",
      };
    }

    const adminObjectId = new mongoose.Types.ObjectId(adminId);

    // Define the base pipeline stages
    const pipeline = [
      // Match orders for the specific admin
      {
        $match: {
          adminId: adminObjectId,
        },
      },

      // Lookup user details
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$createdBy", adminObjectId] },
                    { $in: ["$$userId", "$users._id"] },
                  ],
                },
              },
            },
            {
              $project: {
                user: {
                  $first: {
                    $filter: {
                      input: "$users",
                      as: "user",
                      cond: { $eq: ["$$user._id", "$$userId"] },
                    },
                  },
                },
              },
            },
          ],
          as: "userDetails",
        },
      },

      // Lookup product details for all items in the order
      {
        $lookup: {
          from: "products",
          let: { orderItems: "$items" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$orderItems.productId"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                price: 1,
                images: 1,
                sku: 1,
                type: 1,
                weight: 1,
                purity: 1,
              },
            },
          ],
          as: "productDetails",
        },
      },

      // Final shape of the data
      {
        $project: {
          _id: 1,
          orderNumber: 1,
          orderDate: 1,
          totalPrice: 1,
          totalWeight: 1,
          orderStatus: 1,
          paymentStatus: 1,
          paymentMethod: 1,
          transactionId: 1,
          // Customer information
          customer: {
            $let: {
              vars: {
                userInfo: { $arrayElemAt: ["$userDetails", 0] },
              },
              in: {
                id: "$userId",
                name: "$$userInfo.user.name",
                contact: "$$userInfo.user.contact",
                address: "$$userInfo.user.address",
                email: "$$userInfo.user.email",
                cashBalance: "$$userInfo.user.cashBalance",
                goldBalance: "$$userInfo.user.goldBalance",
              },
            },
          },

          // Products in the order
          items: {
            $map: {
              input: "$items",
              as: "orderItem",
              in: {
                _id: "$$orderItem._id",
                itemStatus: "$$orderItem.itemStatus",
                quantity: "$$orderItem.quantity",
                fixedPrice: "$$orderItem.fixedPrice",
                product: {
                  $let: {
                    vars: {
                      productInfo: {
                        $first: {
                          $filter: {
                            input: "$productDetails",
                            as: "p",
                            cond: { $eq: ["$$p._id", "$$orderItem.productId"] },
                          },
                        },
                      },
                    },
                    in: {
                      id: "$$productInfo._id",
                      title: "$$productInfo.title",
                      sku: "$$productInfo.sku",
                      price: "$$productInfo.price",
                      type: "$$productInfo.type",
                      weight: "$$productInfo.weight",
                      purity: "$$productInfo.purity",
                      images: "$$productInfo.images",
                    },
                  },
                },
              },
            },
          },
        },
      },

      // Sort by order date descending
      { $sort: { orderDate: -1 } },
    ];

    const orders = await orderModel.aggregate(pipeline);

    if (orders.length === 0) {
      return {
        success: false,
        message: "No orders found for this admin.",
      };
    }

    return {
      success: true,
      message: "Orders fetched successfully.",
      orderDetails: orders,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching orders: " + error.message,
    };
  }
};
