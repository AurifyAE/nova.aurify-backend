import mongoose from "mongoose";
import nodemailer from "nodemailer";
import mjml2html from "mjml";
import { Cart } from "../../model/cartSchema.js";
import { orderModel } from "../../model/orderSchema.js";
import { TransactionModel } from "../../model/transaction.js";
import { UsersModel } from "../../model/usersSchema.js";
import adminModel from "../../model/adminSchema.js";
import userNotification from "../../model/userNotificationSchema.js";
import Notification from "../../model/notificationSchema.js";
import OrderStatusService from "../../utils/EmailTemplateBuilder.js";
export const orderPlace = async (adminId, userId, bookingData) => {
  try {
    if (!userId || !adminId || !bookingData?.paymentMethod) {
      return {
        success: false,
        message: "Missing required fields (adminId, userId, paymentMethod).",
      };
    }

    // Create a map of productId to makingCharge from bookingData
    const makingChargesMap = {};
    if (bookingData.bookingData && Array.isArray(bookingData.bookingData)) {
      bookingData.bookingData.forEach((item) => {
        if (item.productId && typeof item.makingCharge === "number") {
          makingChargesMap[item.productId] = item.makingCharge;
        }
      });
    }

    // Fetch the user's cart items
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: cart
          ? "Cart is empty, cannot place an order."
          : "No cart found for the user.",
      };
    }

    let totalPrice = 0;
    let totalWeight = 0;
    const orderItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = item.productId;
        const productIdStr = item.productId._id.toString();
        if (!product || product.price <= 0) {
          return {
            success: false,
            message: product
              ? `Invalid price for product ID ${item.productId}.`
              : `Product with ID ${item.productId} not found.`,
          };
        }

        const fixedPrice = product.price;
        const productWeight = product.weight;
        const makingCharge = makingChargesMap[productIdStr] || 0;
        const itemTotal = fixedPrice * item.quantity;
        const itemWeight = (Number(product.weight) || 0) * item.quantity;

        totalPrice += itemTotal;
        totalWeight += itemWeight;

        return {
          productId: item.productId,
          productName: product.title || "Product",
          quantity: item.quantity,
          fixedPrice: fixedPrice || 0,
          productWeight: productWeight,
          makingCharge: makingCharge,
          totalPrice: itemTotal,
          totalWeight: itemWeight,
          addedAt: new Date(),
        };
      })
    );

    const errorItem = orderItems.find((item) => item.success === false);
    if (errorItem) {
      return errorItem;
    }

    if (totalPrice <= 0) {
      return {
        success: false,
        message: "Invalid total price calculation.",
      };
    }

    // Generate transaction ID
    const orderNo = Math.floor(100 + Math.random() * 9900);
    const transactionId = `ORD-${Date.now().toString().slice(-4)}-${orderNo
      .toString()
      .padStart(4, "0")}`;

    // Create a new order
    const newOrder = new orderModel({
      adminId: new mongoose.Types.ObjectId(adminId),
      userId: new mongoose.Types.ObjectId(userId),
      items: orderItems,
      totalPrice: totalPrice,
      totalWeight: totalWeight,
      paymentMethod: bookingData.paymentMethod,
      orderStatus: "Pending", // Align with order_placed
      transactionId: transactionId,
      createdAt: new Date(),
    });

    const savedOrder = await newOrder.save();

    // Clear booked items from the cart
    const bookedProductIds = orderItems.map((item) => item.productId);
    await Cart.updateOne(
      { userId },
      {
        $pull: { items: { productId: { $in: bookedProductIds } } },
        $set: { totalWeight: 0 },
      }
    );

    // Prepare data for OrderStatusService
    const userData = await UsersModel.findOne(
      { "users._id": userId },
      { "users.$": 1 }
    ).lean();
    const adminInfo = await adminModel.findOne({ _id: adminId }).lean();

    if (!userData || !userData.users.length) {
      return {
        success: false,
        message: "User not found.",
      };
    }

    const userName =
      userData.users[0]?.name || `Customer ${userId.toString().slice(-5)}`;
    const adminData = {
      companyName: adminInfo?.companyName || "Aurify",
      email: adminInfo?.email || "info@aurify.ae",
      contact: adminInfo?.contact || "+971-XXX-XXXX",
      logo:
        adminInfo?.logo ||
        "https://aurifyimage.s3.ap-south-1.amazonaws.com/1744013531086-swiss.webp",
      serviceEmail: adminInfo?.serviceEmail,
      _id: adminId?.toString(),
    };

    const orderData = {
      _id: savedOrder._id.toString(),
      transactionId: savedOrder.transactionId,
      paymentMethod: savedOrder.paymentMethod,
      totalWeight: Number(savedOrder.totalWeight) || 0,
      totalPrice: Number(savedOrder.totalPrice) || 0,
      createdAt: savedOrder.createdAt || new Date(),
      items: savedOrder.items.map((item) => ({
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
      userId: savedOrder.userId.toString(),
      adminId: adminId.toString(),
    };

    const userDataForService = {
      users: [
        {
          _id: userData.users[0]._id.toString(),
          name: userName,
          email: userData.users[0].email || "",
          cashBalance: Number(userData.users[0].cashBalance) || 0,
          goldBalance: Number(userData.users[0].goldBalance) || 0,
        },
      ],
    };

    // Send notifications using OrderStatusService
    const orderStatusService = new OrderStatusService();
    const notificationResult = await orderStatusService.orderPlaced(
      orderData,
      userDataForService,
      adminData,
      {
        orderNote: "Your order is now being reviewed by our team.",
        skipInAppNotifications: false,
        sendSeparateEmails: true,
      }
    );

    if (!notificationResult.success) {
      console.warn(
        "Order placed successfully but failed to send notifications:",
        notificationResult.message
      );
    }

    return {
      success: true,
      message: "Order placed successfully.",
      orderDetails: savedOrder,
      notificationResult,
    };
  } catch (error) {
    console.error("Error placing the order:", error.message);
    return {
      success: false,
      message: "Error placing the order: " + error.message,
    };
  }
};

export const approveOrderItemHelper = async (
  orderId,
  itemId,
  userId,
  updateData = {}
) => {
  try {
    // Input validation
    if (!orderId || !itemId || !userId) {
      return {
        success: false,
        message: "Missing required parameters: orderId, itemId, or userId",
      };
    }

    // Find the order by ID and verify it belongs to the user
    const order = await orderModel.findById(orderId).populate({
      path: "items.productId",
      select: "title description images price weight purity sku",
    });

    if (!order) {
      return {
        success: false,
        message: "Order not found or access denied",
      };
    }

    // Check if order status is "User Approval Pending"
    if (order.orderStatus !== "User Approval Pending") {
      return {
        success: false,
        message: "Order is not pending user approval",
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

    // Check if item is pending approval
    if (order.items[itemIndex].itemStatus !== "User Approval Pending") {
      return {
        success: false,
        message: "Item is not pending user approval",
      };
    }

    // Store original values for reference and comparison
    const originalItem = { ...order.items[itemIndex].toObject() };
    const previousOrderStatus = order.orderStatus;

    // Get product name from populated data or fallback to productName field
    const productName =
      order.items[itemIndex].productId?.title ||
      order.items[itemIndex].productName ||
      "Unknown Product";

    // Update the specific item's status to "Approved"
    order.items[itemIndex].itemStatus = "Approved";

    // Track what was updated
    const changes = {
      statusChanged: false,
      quantityChanged: false,
      priceChanged: false,
      weightChanged: false,
    };

    // Update item properties if provided in updateData
    if (updateData.quantity !== undefined && updateData.quantity > 0) {
      changes.quantityChanged =
        order.items[itemIndex].quantity !== updateData.quantity;
      order.items[itemIndex].quantity = updateData.quantity;
    }
    if (updateData.fixedPrice !== undefined && updateData.fixedPrice >= 0) {
      changes.priceChanged =
        order.items[itemIndex].fixedPrice !== updateData.fixedPrice;
      order.items[itemIndex].fixedPrice = updateData.fixedPrice;
    }
    if (
      updateData.productWeight !== undefined &&
      updateData.productWeight >= 0
    ) {
      changes.weightChanged =
        order.items[itemIndex].productWeight !== updateData.productWeight;
      order.items[itemIndex].productWeight = updateData.productWeight;
    }

    // Recalculate total price for the order (only include approved items)
    order.totalPrice = order.items
      .filter((item) => item.itemStatus === "Approved")
      .reduce(
        (total, item) => total + (item.quantity || 0) * (item.fixedPrice || 0),
        0
      );

    // Recalculate total weight for the order (only include approved items)
    order.totalWeight = order.items
      .filter((item) => item.itemStatus === "Approved")
      .reduce(
        (total, item) =>
          total + (item.quantity || 0) * (item.productWeight || 0),
        0
      );

    // Determine new order status
    const newOrderStatus = determineOrderStatusFromItems(order.items);
    changes.statusChanged = order.orderStatus !== newOrderStatus;
    order.orderStatus = newOrderStatus;

    // Save the updated order
    await order.save();

    // Log the changes
    console.log(`✅ Order ${orderId} item approved:`, {
      itemId,
      userId,
      changes,
      previousStatus: previousOrderStatus,
      newStatus: order.orderStatus,
      approvedItem: {
        name: productName,
        quantity: order.items[itemIndex].quantity,
        price: order.items[itemIndex].fixedPrice,
      },
    });

    // ENHANCED: Always send "approved" notifications when item is approved
    let notificationResult = null;

    try {
      console.log("📧 Sending item approval notifications...");

      // Send "approved" notification using OrderStatusService
      notificationResult = await sendItemApprovalNotifications(order, userId, {
        itemId,
        orderId,
        changes,
        previousOrderStatus,
        newOrderStatus,
        originalItem,
        updatedItem: order.items[itemIndex],
        userAction: "approved",
        approvalTimestamp: new Date(),
        // Item-specific details for notifications
        itemDetails: {
          productName: productName,
          quantity: order.items[itemIndex].quantity,
          price: order.items[itemIndex].fixedPrice,
          weight: order.items[itemIndex].productWeight,
        },
      });
    } catch (notificationError) {
      console.error("❌ Error in notification process:", notificationError);
      // Continue execution - don't fail the approval due to notification errors
    }

    // Add local notification to user notification model
    await addLocalNotificationForApproval(
      order,
      userId,
      itemId,
      previousOrderStatus,
      newOrderStatus
    );

    return {
      success: true,
      message: "Order item approved successfully",
      data: order,
      updatedItem: order.items[itemIndex],
      originalItem: originalItem,
      changes,
      notificationResult,
      statusTransition: {
        from: previousOrderStatus,
        to: newOrderStatus,
      },
    };
  } catch (error) {
    console.error("❌ Error approving order item:", error);
    return {
      success: false,
      message: "Error approving order item: " + error.message,
      error: error.name,
    };
  }
};

export const rejectOrderItemHelper = async (
  orderId,
  itemId,
  userId,
  rejectionReason = ""
) => {
  try {
    // Input validation
    if (!orderId || !itemId || !userId) {
      return {
        success: false,
        message: "Missing required parameters: orderId, itemId, or userId",
      };
    }

    // Find the order by ID and verify it belongs to the user
    const order = await orderModel.findById(orderId).populate({
      path: "items.productId",
      select: "title description images price weight purity sku",
    });

    if (!order) {
      return {
        success: false,
        message: "Order not found or access denied",
      };
    }

    // Check if order status is "User Approval Pending"
    if (order.orderStatus !== "User Approval Pending") {
      return {
        success: false,
        message: "Order is not pending user approval",
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

    // Check if item is pending approval
    if (order.items[itemIndex].itemStatus !== "User Approval Pending") {
      return {
        success: false,
        message: "Item is not pending user approval",
      };
    }

    // Store original values for reference and comparison
    const originalItem = { ...order.items[itemIndex].toObject() };
    const previousOrderStatus = order.orderStatus;

    // Get product name from populated data or fallback to productName field
    const productName =
      order.items[itemIndex].productId?.title ||
      order.items[itemIndex].productName ||
      "Unknown Product";

    // Update the specific item's status to "Rejected"
    order.items[itemIndex].itemStatus = "Rejected";

    // Add rejection reason to the item if provided
    if (rejectionReason) {
      order.items[itemIndex].rejectionReason = rejectionReason;
      order.orderRemark = rejectionReason;
    }

    // Track what was changed
    const changes = {
      statusChanged: false,
      itemRejected: true,
      rejectionReason: rejectionReason || null,
    };

    // Recalculate total price for the order (only include approved items)
    order.totalPrice = order.items
      .filter((item) => item.itemStatus === "Approved")
      .reduce(
        (total, item) => total + (item.quantity || 0) * (item.fixedPrice || 0),
        0
      );

    // Recalculate total weight for the order (only include approved items)
    order.totalWeight = order.items
      .filter((item) => item.itemStatus === "Approved")
      .reduce(
        (total, item) =>
          total + (item.quantity || 0) * (item.productWeight || 0),
        0
      );

    // Determine new order status
    const newOrderStatus = determineOrderStatusFromItems(order.items);
    changes.statusChanged = order.orderStatus !== newOrderStatus;
    order.orderStatus = newOrderStatus;

    // Save the updated order
    await order.save();

    // Log the changes
    console.log(`❌ Order ${orderId} item rejected:`, {
      itemId,
      userId,
      changes,
      previousStatus: previousOrderStatus,
      newStatus: order.orderStatus,
      rejectedItem: {
        name: productName,
        quantity: order.items[itemIndex].quantity,
        price: order.items[itemIndex].fixedPrice,
      },
      rejectionReason,
    });

    // ENHANCED: Always send "rejected" notifications when item is rejected
    let notificationResult = null;

    try {
      console.log("📧 Sending item rejection notifications...");

      // Send "rejected" notification using OrderStatusService
      notificationResult = await sendItemRejectionNotifications(order, userId, {
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
          productName: productName,
          quantity: order.items[itemIndex].quantity,
          price: order.items[itemIndex].fixedPrice,
          weight: order.items[itemIndex].productWeight,
        },
      });
    } catch (notificationError) {
      console.error("❌ Error in notification process:", notificationError);
      // Continue execution - don't fail the rejection due to notification errors
    }

    // Add local notification to user notification model
    await addLocalNotificationForRejection(
      order,
      userId,
      itemId,
      previousOrderStatus,
      newOrderStatus,
      rejectionReason
    );

    return {
      success: true,
      message: "Order item rejected successfully",
      data: order,
      rejectedItem: productName, // Fixed: was using incorrect 'items' instead of 'order.items'
      originalItem: originalItem,
      changes,
      notificationResult,
      statusTransition: {
        from: previousOrderStatus,
        to: newOrderStatus,
      },
    };
  } catch (error) {
    console.error("❌ Error rejecting order item:", error);
    return {
      success: false,
      message: "Error rejecting order item: " + error.message,
      error: error.name,
    };
  }
};

// SHARED HELPER FUNCTIONS (moved to bottom to avoid duplication)

// Helper function to determine order status from items
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

// Data preparation helper functions
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
    productId: item.productId?.toString() || "",
    productName: item.productId?.title || item.productName || "Unknown Product", // Enhanced product name fetching
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

// ENHANCED: Item approval notification function using OrderStatusService
const sendItemApprovalNotifications = async (order, userId, additionalData) => {
  try {
    console.log("🔔 Preparing item approval notifications...");

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

    // Prepare data for OrderStatusService - using "item_approved" status type for consistency
    const orderData = prepareOrderDataForNotification(order, adminId);
    const preparedUserData = prepareUserDataForNotification(
      userData.users[0],
      userId
    );
    const adminData = prepareAdminDataForNotification(adminInfo, adminId);

    // IMPORTANT: Use "item_approved" status type for item approvals to match configs
    const statusType = "item_approved";

    console.log(
      `📧 Sending "${statusType}" notification for approved item - Order Status: ${order.orderStatus}`
    );

    // Enhanced additional data for notifications
    const enhancedAdditionalData = {
      ...additionalData,
      // Item approval specific data
      approvalType: "item_approved",
      approvedByUser: true,
      approvalTimestamp: new Date(),
      // Custom message for item approval
      customMessage: `Your item "${additionalData.itemDetails.productName}" has been approved successfully!`,
      actionType: "item_approval_completed",
      // Item-specific details
      itemDetails: {
        ...additionalData.itemDetails,
        totalValue:
          (additionalData.itemDetails.quantity || 0) *
          (additionalData.itemDetails.price || 0),
      },
      // Email template customization
      emailSubjectSuffix: "- Item Approved",
      // Push notification customization
      pushNotificationTitle: "✅ Item Approved!",
      pushNotificationBody: `Your item "${additionalData.itemDetails.productName}" has been approved for order #${order.transactionId}`,
    };

    // Send notifications using OrderStatusService with "item_approved" type
    const orderStatusService = new OrderStatusService();
    const notificationResult = await orderStatusService.sendOrderStatusUpdates(
      orderData,
      preparedUserData,
      adminData,
      statusType, // Use "item_approved" for item approvals
      enhancedAdditionalData
    );

    if (notificationResult.success) {
      console.log(
        `✅ Item approval notifications sent successfully with type: "${statusType}"`
      );
      console.log(`📊 Notification Results:`, {
        email: notificationResult.results?.email?.success || false,
        push: notificationResult.results?.notifications?.success || false,
        processId: notificationResult.processId,
      });
    } else {
      console.warn(
        `⚠️ Item approval notifications partially failed: ${notificationResult.message}`
      );
    }

    return notificationResult;
  } catch (notificationError) {
    console.error(
      "❌ Error sending item approval notifications:",
      notificationError
    );
    return {
      success: false,
      message:
        "Item approval notifications failed: " + notificationError.message,
      error: notificationError.name,
      statusType: "item_approved",
    };
  }
};

// ENHANCED: Item rejection notification function using OrderStatusService
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
        additionalData.itemDetails.productName
      }" has been rejected. ${
        additionalData.rejectionReason
          ? "Reason: " + additionalData.rejectionReason
          : ""
      }`,
      actionType: "item_rejection_completed",
      // Item-specific details
      itemDetails: {
        ...additionalData.itemDetails,
        totalValue:
          (additionalData.itemDetails.quantity || 0) *
          (additionalData.itemDetails.price || 0),
      },
      // Email template customization
      emailSubjectSuffix: "- Item Rejected",
      // Push notification customization
      pushNotificationTitle: "❌ Item Rejected",
      pushNotificationBody: `Your item "${
        additionalData.itemDetails.productName
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

// Enhanced local notification function for item approval
const addLocalNotificationForApproval = async (
  order,
  userId,
  itemId,
  previousStatus,
  newStatus
) => {
  try {
    // Always create notification for item approval, even if order status hasn't changed
    let notificationMessage = "";
    let notificationType = "Approved";

    // Find the approved item details
    const approvedItem = order.items.find(
      (item) => item._id.toString() === itemId
    );

    // Get product name from populated data or fallback to productName field
    const itemName =
      approvedItem?.productId?.title ||
      approvedItem?.productName ||
      "Unknown Item";

    // Create item-specific approval notification
    notificationMessage = `✅ Item "${itemName}" approved! Your order #${order.transactionId} item has been successfully approved.`;

    // Add additional context based on order status
    if (newStatus !== previousStatus) {
      switch (newStatus) {
        case "Pending":
          notificationMessage += " Your order is now ready for processing.";
          break;
        case "Processing":
          notificationMessage += " Your order is now being processed.";
          break;
        case "Partially Processed":
          notificationMessage +=
            " Some items in your order are still pending approval.";
          notificationType = "Warning";
          break;
        case "Cancelled":
          notificationMessage += " However, your order has been cancelled.";
          notificationType = "Cancelled";
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
        action: "item_approval",
        previousOrderStatus: previousStatus,
        newOrderStatus: newStatus,
        transactionId: order.transactionId,
        itemName: itemName,
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
      `✅ Local notification added for user ${userId} - Item: ${itemName}, Status: ${newStatus}`
    );
  } catch (notificationError) {
    console.error(
      "❌ Error creating local notification:",
      notificationError.message
    );
    // Continue processing - notification failure shouldn't stop the order update
  }
};

// Enhanced local notification function for item rejection
const addLocalNotificationForRejection = async (
  order,
  userId,
  itemId,
  previousStatus,
  newStatus,
  rejectionReason
) => {
  try {
    // Always create notification for item rejection, even if order status hasn't changed
    let notificationMessage = "";
    let notificationType = "Rejected";

    // Find the rejected item details
    const rejectedItem = order.items.find(
      (item) => item._id.toString() === itemId
    );

    // Get product name from populated data or fallback to productName field
    const itemName =
      rejectedItem?.productId?.title ||
      rejectedItem?.productName ||
      "Unknown Item";

    // Create item-specific rejection notification
    notificationMessage = `❌ Item "${itemName}" rejected for order #${order.transactionId}.`;

    if (rejectionReason) {
      notificationMessage += ` Reason: ${rejectionReason}`;
    }

    // Add additional context based on order status
    if (newStatus !== previousStatus) {
      switch (newStatus) {
        case "Pending":
          notificationMessage += " Other approved items will be processed.";
          break;
        case "Processing":
          notificationMessage += " Other items are being processed.";
          break;
        case "Partially Processed":
          notificationMessage += " Some items are still pending approval.";
          break;
        case "Cancelled":
          notificationMessage += " Your entire order has been cancelled.";
          notificationType = "Cancelled";
          break;
        default:
          notificationMessage += ` Order status: ${newStatus}`;
      }
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
      `✅ Local rejection notification added for user ${userId} - Item: ${itemName}, Status: ${newStatus}`
    );
  } catch (notificationError) {
    console.error(
      "❌ Error creating local rejection notification:",
      notificationError.message
    );
    // Continue processing - notification failure shouldn't stop the order update
  }
};

export const fetchBookingDetails = async (
  adminId,
  userId,
  page,
  limit,
  orderStatus
) => {
  try {
    if (!adminId || !userId) {
      return { success: false, message: "Admin ID and User ID are required." };
    }

    const adminObjectId = new mongoose.Types.ObjectId(adminId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Create match condition based on orderStatus
    const matchCondition = {
      adminId: adminObjectId,
      userId: userObjectId,
    };

    // Add orderStatus to match condition if provided
    if (orderStatus) {
      matchCondition.orderStatus = orderStatus;
    }

    // Count total orders for pagination with status filter
    const totalOrders = await orderModel.countDocuments(matchCondition);

    if (totalOrders === 0) {
      return {
        success: false,
        message: orderStatus
          ? `No orders found with status '${orderStatus}' for the given admin and user.`
          : "No orders found for the given admin and user.",
      };
    }

    const pipeline = [
      { $match: matchCondition },

      // Rest of your existing pipeline stages...
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            { $unwind: "$users" },
            { $match: { $expr: { $eq: ["$users._id", "$$userId"] } } },
            {
              $project: {
                _id: "$users._id",
                name: "$users.name",
                contact: "$users.contact",
                address: "$users.address",
                email: "$users.email",
              },
            },
          ],
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },

      // Project required fields
      {
        $project: {
          orderNumber: 1,
          orderDate: 1,
          totalPrice: 1,
          totalWeight: 1,
          orderStatus: 1,
          paymentStatus: 1,
          paymentMethod: 1,
          transactionId: 1,
          customer: {
            id: "$userId",
            name: { $ifNull: ["$userDetails.name", "N/A"] },
            contact: { $ifNull: ["$userDetails.contact", "N/A"] },
            address: { $ifNull: ["$userDetails.address", "N/A"] },
            email: { $ifNull: ["$userDetails.email", "N/A"] },
          },
          items: {
            $map: {
              input: "$items",
              as: "orderItem",
              in: {
                _id: "$$orderItem._id",
                itemStatus: "$$orderItem.itemStatus",
                quantity: "$$orderItem.quantity",
                product: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$productDetails",
                        as: "p",
                        cond: { $eq: ["$$p._id", "$$orderItem.productId"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },

      { $sort: { orderDate: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const orders = await orderModel.aggregate(pipeline);

    return {
      success: true,
      message: "Orders fetched successfully.",
      orderDetails: orders,
      pagination: {
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      success: false,
      message: "Error fetching orders: " + error.message,
    };
  }
};

export const getUserTransactions = async (userId, options = {}) => {
  try {
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return {
        success: false,
        message: "Invalid user ID format",
      };
    }

    // Set default options
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = -1,
      filterBy = null,
      filterValue = null,
      startDate = null,
      endDate = null,
    } = options;

    // Build query
    const query = { userId };

    // Apply filters
    if (filterBy && filterValue) {
      query[filterBy] = filterValue;
    }

    // Apply date range filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder };

    const transactions = await TransactionModel.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "orderId",
        select: "orderNumber totalAmount totalWeight paymentMethod",
      });

    // Get total count
    const totalCount = await TransactionModel.countDocuments(query);

    // Calculate summary statistics
    const summary = await calculateTransactionSummary(userId);

    // Get user details
    const user = await UsersModel.findOne(
      { "users._id": userId },
      { "users.$": 1 }
    );

    if (!user || !user.users.length) {
      return {
        success: false,
        message: "User not found",
      };
    }

    const userDetails = user.users[0];

    // Calculate balance info
    const goldBalance = Number(userDetails.goldBalance) || 0;
    const cashBalance = Number(userDetails.cashBalance) || 0;

    const balanceInfo = {
      totalGoldBalance: goldBalance,
      availableGold: goldBalance > 0 ? goldBalance : 0,
      goldCredit: goldBalance < 0 ? Math.abs(goldBalance) : 0,
      cashBalance: cashBalance,
      name: userDetails.name,
      email: userDetails.email,
    };

    return {
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
        },
        summary,
        balanceInfo,
      },
    };
  } catch (error) {
    console.error("Error in getUserTransactions:", error);
    return {
      success: false,
      message: "Error fetching transactions: " + error.message,
    };
  }
};

async function calculateTransactionSummary(userId) {
  try {
    // Get total credits and debits for gold
    const goldCredits = await TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "CREDIT",
          balanceType: "GOLD",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const goldDebits = await TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "DEBIT",
          balanceType: "GOLD",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get total credits and debits for cash
    const cashCredits = await TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "CREDIT",
          balanceType: "CASH",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const cashDebits = await TransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "DEBIT",
          balanceType: "CASH",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent transactions
    const recentTransactions = await TransactionModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      gold: {
        totalCredits: goldCredits[0]?.total || 0,
        totalDebits: goldDebits[0]?.total || 0,
        creditCount: goldCredits[0]?.count || 0,
        debitCount: goldDebits[0]?.count || 0,
        netFlow: (goldCredits[0]?.total || 0) - (goldDebits[0]?.total || 0),
      },
      cash: {
        totalCredits: cashCredits[0]?.total || 0,
        totalDebits: cashDebits[0]?.total || 0,
        creditCount: cashCredits[0]?.count || 0,
        debitCount: cashDebits[0]?.count || 0,
        netFlow: (cashCredits[0]?.total || 0) - (cashDebits[0]?.total || 0),
      },
      recentTransactions: recentTransactions.map((t) => ({
        transactionId: t.transactionId,
        type: t.type,
        method: t.method,
        amount: t.amount,
        balanceType: t.balanceType,
        createdAt: t.createdAt,
      })),
    };
  } catch (error) {
    console.error("Error calculating transaction summary:", error);
    return {
      gold: {
        totalCredits: 0,
        totalDebits: 0,
        creditCount: 0,
        debitCount: 0,
        netFlow: 0,
      },
      cash: {
        totalCredits: 0,
        totalDebits: 0,
        creditCount: 0,
        debitCount: 0,
        netFlow: 0,
      },
      recentTransactions: [],
    };
  }
}
