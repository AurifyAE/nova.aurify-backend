import mongoose from "mongoose";
import nodemailer from "nodemailer";
import mjml2html from "mjml";
import { Cart } from "../../model/cartSchema.js";
import { orderModel } from "../../model/orderSchema.js";
import Product from "../../model/productSchema.js";
import { TransactionModel } from "../../model/transaction.js";
import { UsersModel } from "../../model/usersSchema.js";
import adminModel from "../../model/adminSchema.js";
import userNotification from "../../model/userNotificationSchema.js";
import Notification from "../../model/notificationSchema.js";
// Function to send order confirmation email
const sendOrderConfirmationEmail = async (order, userData) => {
  try {
    if (!order || !userData) {
      throw new Error("Missing order or user data");
    }

    const user = userData.users[0];
    const userEmail = user.email;
    const userName = user.name;

    // Get admin data
    const admin = await adminModel.findById(order.adminId);
    const adminBrandName =
      admin && admin.companyName ? admin.companyName : "Aurify";

    // Get product details for all items
    // Get product details for all items
    const orderItems = await Promise.all(
      order.items.map(async (item) => {
        const product = await mongoose
          .model("Product")
          .findById(item.productId);

        // Make sure we have all the required fields
        return {
          productId: item.productId,
          productName: product ? product.title : "Product",
          productWeight: product ? product.weight : 0,
          quantity: item.quantity || 0,
          fixedPrice: item.fixedPrice || 0,
          totalPrice: item.totalPrice || 0,
          // Include any other fields needed from the original item
        };
      })
    );

    // Email configuration
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Format total price with comma separators for Indian Rupees
    const formattedTotalPrice = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(order.totalPrice);

    // Generate order items HTML for the email
    const orderItemsHTML = orderItems
      .map((item) => {
        // Make sure we have valid numbers for calculation
        const price = Number(item.fixedPrice) || 0;
        const quantity = Number(item.quantity) || 0;

        // Calculate the total price for this item
        const itemTotal = price * quantity;

        // Format the prices for display
        const formattedPrice = new Intl.NumberFormat("en-IN", {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }).format(price);

        const formattedItemTotal = new Intl.NumberFormat("en-IN", {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        }).format(itemTotal);

        return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #E0E0E0;">${item.productName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; text-align: center;">${quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; text-align: right;">${item.productWeight}g</td>
          <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; text-align: right;">AED ${formattedPrice}</td>
          <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; text-align: right;">AED ${formattedItemTotal}</td>
        </tr>
      `;
      })
      .join("");

    const mailOptions = {
      from: `"${adminBrandName} Precious Metals" <${
        process.env.EMAIL_USER || "aurifycontact@gmail.com"
      }>`,
      to: userEmail,
      subject: `🎉 Order Confirmed - ${adminBrandName} Order #${order.transactionId}`,
      html: mjml2html(`
        <mjml>
          <mj-head>
            <mj-title>Order Confirmation - ${adminBrandName}</mj-title>
            <mj-attributes>
              <mj-all font-family="'Segoe UI', Arial, sans-serif" />
            </mj-attributes>
            <mj-style>
              .header-gold {
                background: linear-gradient(135deg, #D4AF37 0%, #F5E7A0 50%, #D4AF37 100%);
              }
              .gold-text {
                color: #D4AF37;
              }
              .product-table {
                width: 100%;
                border-collapse: collapse;
              }
              .product-table th {
                background-color: #F5F5F5;
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #D4AF37;
              }
              .order-summary {
                background-color: #FAFAFA;
                border-radius: 8px;
                border-left: 4px solid #D4AF37;
              }
              .success-badge {
                background-color: #4CAF50;
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-weight: bold;
              }
              .thank-you-section {
                background-color: #FFF8E1;
              }
            </mj-style>
          </mj-head>
          
          <mj-body background-color="#F9F9F9">
            <!-- Header -->
            <mj-section css-class="header-gold" padding="20px 0">
              <mj-column>
                <mj-text font-size="26px" font-weight="bold" align="center" color="#333333">
                  ${adminBrandName}
                </mj-text>
                <mj-text font-size="16px" align="center" color="#333333" font-style="italic" padding-top="5px">
                  Precious Metals
                </mj-text>
              </mj-column>
            </mj-section>
            
            <!-- Order Confirmation Banner -->
            <mj-section background-color="#FFFFFF" padding="10px 0">
              <mj-column>
                <mj-text align="center" font-size="14px">
                  <span class="success-badge">ORDER CONFIRMED</span>
                </mj-text>
              </mj-column>
            </mj-section>

            <!-- Main Content -->
            <mj-section background-color="#FFFFFF" padding="20px" border-radius="8px">
              <mj-column>
                <!-- Greeting -->
                <mj-text font-size="18px" font-weight="bold" color="#333333" padding-bottom="10px">
                  Dear ${userName},
                </mj-text>
                
                <mj-text font-size="16px" color="#555555" line-height="1.5">
                  Thank you for your order! We're pleased to confirm that your order has been received and is being processed. Here's a summary of your purchase:
                </mj-text>
                
                <!-- Order Summary Box -->
                <mj-section css-class="order-summary" padding="15px" margin="20px 0">
                  <mj-column>
                    <mj-text font-size="16px" font-weight="bold" color="#333333">
                      Order Summary
                    </mj-text>
                    <mj-text font-size="14px" color="#555555" line-height="1.6">
                      <strong>Order Number:</strong> ${order.transactionId}<br>
                      <strong>Order Date:</strong> ${new Date().toLocaleDateString(
                        "en-IN",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}<br>
                      <strong>Payment Method:</strong> ${
                        order.paymentMethod
                      }<br>
                      <strong>Total Weight:</strong> ${order.totalWeight}g<br>
                      <strong>Total Amount:</strong> AED ${formattedTotalPrice}
                    </mj-text>
                  </mj-column>
                </mj-section>
                
                <!-- Order Items -->
                <mj-text font-size="16px" font-weight="bold" color="#333333" padding-bottom="10px">
                  Order Details
                </mj-text>
                
                <mj-table css-class="product-table">
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Weight</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                  ${orderItemsHTML}
                  <tr>
                    <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold;">Grand Total:</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #D4AF37;">AED ${formattedTotalPrice}</td>
                  </tr>
                </mj-table>
                
                <!-- Next Steps -->
                <mj-text font-size="16px" font-weight="bold" color="#333333" padding-top="20px">
                  What Happens Next?
                </mj-text>
                <mj-text font-size="14px" color="#555555" line-height="1.5">
                  1. Our team will verify your order and process your payment.<br>
                  2. You'll receive an order processing confirmation.<br>
                  3. Once your items are ready to ship, you'll receive a shipping confirmation with tracking details.
                </mj-text>
              </mj-column>
            </mj-section>
            
            <!-- Thank You Section -->
            <mj-section css-class="thank-you-section" padding="20px" border-radius="8px" margin-top="20px">
              <mj-column>
                <mj-text font-size="18px" font-weight="bold" align="center" css-class="gold-text">
                  Thank You for Choosing ${adminBrandName}
                </mj-text>
                <mj-text font-size="14px" color="#555555" align="center" line-height="1.5">
                  We appreciate your business and look forward to delivering your precious metals.
                </mj-text>
              </mj-column>
            </mj-section>
            
            <!-- Contact Support -->
            <mj-section background-color="#FFFFFF" padding="20px" border-radius="8px" margin-top="20px">
              <mj-column>
                <mj-text font-size="16px" font-weight="bold" color="#333333" align="center">
                  Questions About Your Order?
                </mj-text>
                <mj-divider border-color="#EEEEEE" padding="10px 0" />
                <mj-text font-size="14px" color="#555555" align="center" line-height="1.5">
                  <strong>📞 Call:</strong> ${
                    admin.contact || "Contact Support"
                  }<br>
                  <strong>✉️ Email:</strong> ${
                    admin.email || "support@aurify.com"
                  }<br>
                  <strong>⏰ Hours:</strong> Monday-Friday, 9AM-6PM IST
                </mj-text>
              </mj-column>
            </mj-section>

            <!-- Footer -->
            <mj-section background-color="#333333" padding="20px">
              <mj-column>
                <mj-text color="#FFFFFF" font-size="14px" align="center" font-weight="bold">
                  ${adminBrandName} Precious Metals
                </mj-text>
                <mj-text color="#D4AF37" font-size="12px" align="center" font-style="italic" padding-top="5px">
                  Quality and Trust Since 2020
                </mj-text>
                <mj-divider border-color="#555555" padding="10px 0" />
                <mj-text color="#AAAAAA" font-size="11px" align="center">
                  © ${new Date().getFullYear()} ${adminBrandName} Precious Metals. All Rights Reserved.<br>
                  This email confirms your order with ${adminBrandName}.
                </mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `).html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Order confirmation email sent:", info.messageId);

    return {
      success: true,
      message: "Order confirmation email sent successfully",
    };
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return {
      success: false,
      message: "Error sending order confirmation email",
      error: error.message,
    };
  }
};

export const orderPlace = async (adminId, userId, bookingData) => {
  try {
    if (!userId || !adminId || !bookingData?.paymentMethod) {
      return {
        success: false,
        message: "Missing required fields (adminId, userId, paymentMethod).",
      };
    }

    // Create a map of productId to makingCharge from bookingData for quick lookup
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

    // Check if the cart exists and has items
    if (!cart) {
      return {
        success: false,
        message: "No cart found for the user.",
      };
    }

    if (cart.items.length === 0) {
      return {
        success: false,
        message: "Cart is empty, cannot place an order.",
      };
    }

    let totalPrice = 0;
    let totalWeight = 0;
    const orderItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.productId);
        const productIdStr = item.productId._id.toString();
        if (!product) {
          return {
            success: false,
            message: `Product with ID ${item.productId} not found.`,
          };
        }

        if (product.price <= 0) {
          return {
            success: false,
            message: `Invalid price for product ID ${item.productId}.`,
          };
        }

        const fixedPrice = product.price;
        const productWeight = product.weight;

        // Get making charge from bookingData if available
        // Use the proper product ID string for lookup
        const makingCharge = makingChargesMap[productIdStr] || 0;

        // Calculate total price including making charge
        const itemTotal = fixedPrice * item.quantity;
        const itemWeight = (Number(product.weight) || 0) * item.quantity;

        totalPrice += itemTotal;
        totalWeight += itemWeight;

        return {
          productId: item.productId,
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

    // Check if any item returned an error object
    const errorItem = orderItems.find((item) => item.success === false);
    if (errorItem) {
      return errorItem; // Return the error
    }

    // Validate total price
    if (totalPrice <= 0) {
      return {
        success: false,
        message: "Invalid total price calculation.",
      };
    }

    // Generate a transaction ID (you can customize this format)
    const transactionId = `ORD-${Date.now().toString().slice(-8)}-${Math.floor(
      Math.random() * 1000
    )}`;

    // Create a new order with the fixed price, making charge, and total weight
    const newOrder = new orderModel({
      adminId: new mongoose.Types.ObjectId(adminId),
      userId: new mongoose.Types.ObjectId(userId),
      items: orderItems,
      totalPrice: totalPrice,
      totalWeight: totalWeight,
      paymentMethod: bookingData.paymentMethod,
      orderStatus: "Processing",
      transactionId: transactionId,
    });

    const savedOrder = await newOrder.save();

    if (savedOrder) {
      // Clear booked items from the cart
      const bookedProductIds = orderItems.map((item) => item.productId);
      await Cart.updateOne(
        { userId },
        {
          $pull: { items: { productId: { $in: bookedProductIds } } },
          $set: { totalWeight: 0 },
        }
      );

      // Get user data for the email and notifications
      const userData = await UsersModel.findOne(
        { "users._id": userId },
        { "users.$": 1 }
      );

      // Extract user name for notifications
      let userName = "Customer";
      if (userData && userData.users && userData.users.length > 0) {
        // Try to get the user's name, falling back to different name fields if available
        userName =
          userData.users[0].name || `Customer ${userId.toString().slice(-5)}`;

        // Send order confirmation email
        const emailResult = await sendOrderConfirmationEmail(
          savedOrder,
          userData
        );

        if (!emailResult.success) {
          console.warn(
            "Order placed successfully but failed to send confirmation email:",
            emailResult.message
          );
        }
      } else {
        console.warn("User data not found for sending confirmation email");
      }

      // Create notification for user
      try {
        const userNotificationMessage = `Your order #${transactionId} has been placed successfully for ${totalPrice.toFixed(
          2
        )}. Your order status is 'Pending'.`;

        // Find existing user notification document or create a new one
        let userNotificationDoc = await userNotification.findOne({
          createdBy: userId,
        });

        if (userNotificationDoc) {
          // Add notification to existing document
          userNotificationDoc.notification.push({
            message: userNotificationMessage,
            read: false,
            createdAt: new Date(),
          });
          await userNotificationDoc.save();
        } else {
          // Create new notification document
          userNotificationDoc = new userNotification({
            notification: [
              {
                message: userNotificationMessage,
                read: false,
                createdAt: new Date(),
              },
            ],
            createdBy: userId,
          });
          await userNotificationDoc.save();
        }

        // Create notification for admin with user's name
        const adminNotificationMessage = `New order #${transactionId} placed by ${userName} for ${totalPrice.toFixed(
          2
        )}.`;

        let adminNotificationDoc = await Notification.findOne({
          createdBy: adminId,
        });

        if (adminNotificationDoc) {
          // Add notification to existing document
          adminNotificationDoc.notification.push({
            message: adminNotificationMessage,
            read: false,
            createdAt: new Date(),
          });
          await adminNotificationDoc.save();
        } else {
          // Create new notification document
          adminNotificationDoc = new Notification({
            notification: [
              {
                message: adminNotificationMessage,
                read: false,
                createdAt: new Date(),
              },
            ],
            createdBy: adminId,
          });
          await adminNotificationDoc.save();
        }

        console.log("Notifications created for both user and admin");
      } catch (notificationError) {
        console.error(
          "Error creating notifications:",
          notificationError.message
        );
        // Don't return error here, as the order is already placed successfully
      }

      return {
        success: true,
        message: "Order placed successfully.",
        orderDetails: savedOrder,
      };
    }

    return {
      success: false,
      message: "Failed to process the order.",
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
    // Find the order by ID and verify it belongs to the user
    const order = await orderModel.findOne({
      _id: orderId,
      userId: userId,
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

    // Store original values for reference
    const originalItem = { ...order.items[itemIndex].toObject() };

    // Update the specific item's status to "Approved"
    order.items[itemIndex].itemStatus = "Approved";

    // Update item properties if provided in updateData
    if (updateData.quantity !== undefined && updateData.quantity > 0) {
      order.items[itemIndex].quantity = updateData.quantity;
    }
    if (updateData.fixedPrice !== undefined && updateData.fixedPrice >= 0) {
      order.items[itemIndex].fixedPrice = updateData.fixedPrice;
    }
    if (
      updateData.productWeight !== undefined &&
      updateData.productWeight >= 0
    ) {
      order.items[itemIndex].productWeight = updateData.productWeight;
    }

    // Recalculate total price for the order (only include approved items)
    order.totalPrice = order.items
      .filter((item) => item.itemStatus === "Approved")
      .reduce((total, item) => total + item.quantity * item.fixedPrice, 0);

    // Recalculate total weight for the order (only include approved items)
    order.totalWeight = order.items
      .filter((item) => item.itemStatus === "Approved")
      .reduce((total, item) => total + item.quantity * item.productWeight, 0);

    // Check if all items are now "Approved"
    const allApproved = order.items.every(
      (item) => item.itemStatus === "Approved"
    );

    // Check if any item still has "User Approval Pending"
    const anyUserApprovalPending = order.items.some(
      (item) => item.itemStatus === "User Approval Pending"
    );

    // Check if any item is rejected
    const anyRejected = order.items.some(
      (item) => item.itemStatus === "Rejected"
    );

    let previousStatus = order.orderStatus;

    // Update orderStatus based on items' statuses
    if (allApproved) {
      order.orderStatus = "Success";
    } else if (anyUserApprovalPending) {
      order.orderStatus = "User Approval Pending";
    } else if (
      anyRejected &&
      order.items.filter((item) => item.itemStatus === "Approved").length > 0
    ) {
      order.orderStatus = "Partially Processed";
    } else if (order.items.every((item) => item.itemStatus === "Rejected")) {
      order.orderStatus = "Cancelled";
    } else {
      order.orderStatus = "Processing";
    }

    // Save the updated order
    await order.save();

    // Add notification to user notification model for status change
    if (order.orderStatus !== previousStatus) {
      try {
        let notificationMessage = "";

        // Create appropriate notification message based on new status
        switch (order.orderStatus) {
          case "Success":
            notificationMessage = `🎉 Congratulations! Your order #${order.transactionId} has been fully approved and is being processed.`;
            break;
          case "Processing":
            notificationMessage = `📦 Your order #${order.transactionId} is now being processed. We'll keep you updated on its progress.`;
            break;
          case "Partially Processed":
            notificationMessage = `⚠️ Your order #${order.transactionId} is partially processed. Some items were approved while others were rejected.`;
            break;
          default:
            notificationMessage = `📝 Your order #${order.transactionId} status has been updated to: ${order.orderStatus}`;
        }

        // Determine notification type based on order status
        let notificationType = "default";
        if (order.orderStatus === "Success") {
          notificationType = "Approved";
        }

        // Find existing user notification document or create a new one
        let userNotificationDoc = await userNotification.findOne({
          createdBy: order.userId,
        });

        if (userNotificationDoc) {
          // Add notification to existing document
          userNotificationDoc.notification.push({
            message: notificationMessage,
            read: false,
            createdAt: new Date(),
            orderId: orderId,
            itemId: itemId,
            type: notificationType,
          });
          await userNotificationDoc.save();
        } else {
          // Create new notification document
          userNotificationDoc = new userNotification({
            notification: [
              {
                message: notificationMessage,
                read: false,
                createdAt: new Date(),
                orderId: orderId,
                itemId: itemId,
                type: notificationType,
              },
            ],
            createdBy: order.userId,
          });
          await userNotificationDoc.save();
        }

        console.log(
          `Order approval notification added for user ${order.userId}`
        );
      } catch (notificationError) {
        console.error(
          "Error creating order approval notification:",
          notificationError.message
        );
        // Continue processing - notification failure shouldn't stop the order update
      }
    }

    return {
      success: true,
      message: "Order item approved successfully",
      data: order,
      updatedItem: order.items[itemIndex],
      originalItem: originalItem,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error approving order item: " + error.message,
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
    // Find the order by ID and verify it belongs to the user
    const order = await orderModel.findOne({
      _id: orderId,
      userId: userId,
    });

    if (!order) {
      return {
        success: false,
        message: "Order not found or access denied",
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

    // Store the rejected item's values for calculation
    const rejectedItem = order.items[itemIndex];

    // Update the specific item's status to "Rejected"
    order.items[itemIndex].itemStatus = "Rejected";

    // Add rejection reason to order remarks if provided
    if (rejectionReason) {
      order.orderRemark = rejectionReason;
    }

    // Recalculate total price for the order (exclude rejected items)
    order.totalPrice = order.items
      .filter((item) => item.itemStatus === "Approved")
      .reduce((total, item) => total + item.quantity * item.fixedPrice, 0);

    // Recalculate total weight for the order (exclude rejected items)
    order.totalWeight = order.items
      .filter((item) => item.itemStatus === "Approved")
      .reduce((total, item) => total + item.quantity * item.productWeight, 0);

    // Check order status after rejection
    const anyUserApprovalPending = order.items.some(
      (item) => item.itemStatus === "User Approval Pending"
    );

    const allRejected = order.items.every(
      (item) => item.itemStatus === "Rejected"
    );

    const anyApproved = order.items.some(
      (item) => item.itemStatus === "Approved"
    );

    let previousStatus = order.orderStatus;

    // Update order status
    if (allRejected) {
      order.orderStatus = "Cancelled";
      order.totalPrice = 0;
      order.totalWeight = 0;
    } else if (anyUserApprovalPending) {
      order.orderStatus = "User Approval Pending";
    } else {
      order.orderStatus = "Processing";
    }

    // Save the updated order
    await order.save();

    // Add notification for rejection
    try {
      let notificationMessage = "";
      let notificationType = "Rejected";

      if (order.orderStatus === "Cancelled") {
        notificationMessage = `❌ Your order #${
          order.transactionId
        } has been cancelled as all items were rejected. ${
          rejectionReason ? "Reason: " + rejectionReason : ""
        }`;
      } else if (order.orderStatus === "Partially Processed") {
        notificationMessage = `⚠️ An item in your order #${
          order.transactionId
        } has been rejected. Your order will proceed with the remaining approved items. ${
          rejectionReason ? "Reason: " + rejectionReason : ""
        }`;
      } else {
        notificationMessage = `❌ Item in order #${
          order.transactionId
        } has been rejected. ${
          rejectionReason ? "Reason: " + rejectionReason : ""
        }`;
      }

      let userNotificationDoc = await userNotification.findOne({
        createdBy: order.userId,
      });

      if (userNotificationDoc) {
        userNotificationDoc.notification.push({
          message: notificationMessage,
          read: false,
          createdAt: new Date(),
          orderId: orderId,
          itemId: itemId,
          type: notificationType,
        });
        await userNotificationDoc.save();
      } else {
        userNotificationDoc = new userNotification({
          notification: [
            {
              message: notificationMessage,
              read: false,
              createdAt: new Date(),
              orderId: orderId,
              itemId: itemId,
              type: notificationType,
            },
          ],
          createdBy: order.userId,
        });
        await userNotificationDoc.save();
      }
    } catch (notificationError) {
      console.error(
        "Error creating rejection notification:",
        notificationError.message
      );
    }

    return {
      success: true,
      message: "Order item rejected successfully",
      data: order,
      rejectedItem: rejectedItem,
      statusChanged: previousStatus !== order.orderStatus,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error rejecting order item: " + error.message,
    };
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
