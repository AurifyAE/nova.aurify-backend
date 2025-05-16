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
export const updateOrderDetails = async (orderId, orderStatus) => {
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return {
      success: false,
      message: "Invalid order ID format",
    };
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { orderStatus },
      { new: true, runValidators: true, session }
    ).populate("items.productId");

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

    let orderNotificationMessage = `Your order #${orderId
      .toString()
      .slice(-6)} `;
    switch (orderStatus) {
      case "Approved":
        orderNotificationMessage += "has been approved and is being processed.";
        break;
      case "Processing":
        orderNotificationMessage += "is now being processed.";
        break;
      case "Shipped":
        orderNotificationMessage += "has been shipped.";
        break;
      case "Delivered":
        orderNotificationMessage +=
          "has been delivered. Thank you for your purchase!";
        break;
      case "Cancelled":
        orderNotificationMessage += "has been cancelled.";
        break;
      default:
        orderNotificationMessage += `status has been updated to ${orderStatus}.`;
    }

    const addNotification = async (userId, message) => {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.error("Invalid userId for notification:", userId);
        throw new Error("Invalid userId for notification");
      }
      try {
        let notification = await userNotification.findOne(
          { createdBy: userId },
          null,
          { session }
        );

        if (notification) {
          notification.notification.push({
            message,
            read: false,
            createdAt: new Date(),
          });
          await notification.save({ session });
        } else {
          notification = new userNotification({
            notification: [
              {
                message,
                read: false,
                createdAt: new Date(),
              },
            ],
            createdBy: userId,
          });
          await notification.save({ session });
        }
       
      } catch (err) {
        console.error("Error creating notification:", err);
        throw err;
      }
    };

    await addNotification(userId, orderNotificationMessage);

    if (orderStatus === "Approved") {
      const user = await UsersModel.findOne(
        { "users._id": userId },
        { "users.$": 1 },
        { session }
      );

      if (!user || !user.users.length) {
        throw new Error("User not found");
      }

      const currentUser = user.users[0];

      const totalAmount = Number(updatedOrder.totalPrice);
      const totalWeight = Number(updatedOrder.totalWeight);

      if (isNaN(totalAmount) || isNaN(totalWeight)) {
        throw new Error(
          "Invalid order amounts: totalAmount or totalWeight is not a number"
        );
      }

      let updateOperation = {};
      let transactions = [];
      let transactionNotificationMessages = [];

      if (updatedOrder.paymentMethod === "Cash") {
        // For Cash payment, deduct entire amount from cash balance
        const currentCashBalance = Number(currentUser.cashBalance) || 0;
        const newCashBalance = currentCashBalance - totalAmount;

        updateOperation = {
          "users.$.cashBalance": newCashBalance,
        };

        transactions.push({
          userId,
          type: "DEBIT",
          method: "CASH",
          amount: totalAmount,
          balanceType: "CASH",
          balanceAfter: newCashBalance,
          orderId,
        });

        transactionNotificationMessages.push(`A cash payment of ${totalAmount.toFixed(
          2
        )} has been processed for your order #${orderId
          .toString()
          .slice(-6)}. Your new cash balance is ${newCashBalance.toFixed(2)}.`);
      } else if (
        updatedOrder.paymentMethod === "Gold To Gold" ||
        updatedOrder.paymentMethod === "Gold"
      ) {
        // For Gold payment, we need to split between gold weight and making charges
        
        // Calculate total making charges from all items
        let totalMakingCharge = 0;
        if (updatedOrder.items && Array.isArray(updatedOrder.items)) {
          totalMakingCharge = updatedOrder.items.reduce((sum, item) => {
            return sum + (Number(item.makingCharge || 0) * Number(item.quantity || 1));
          }, 0);
        }
        
        // Update gold balance for the product weight
        const currentGoldBalance = Number(currentUser.goldBalance) || 0;
        const newGoldBalance = currentGoldBalance - totalWeight;
        
        // Update cash balance for the making charges
        const currentCashBalance = Number(currentUser.cashBalance) || 0;
        const newCashBalance = currentCashBalance - totalMakingCharge;
        
        updateOperation = {
          "users.$.goldBalance": newGoldBalance,
          "users.$.cashBalance": newCashBalance
        };
        
        // Add gold transaction
        transactions.push({
          userId,
          type: "DEBIT",
          method: "GOLD_TO_GOLD",
          amount: totalWeight,
          balanceType: "GOLD",
          balanceAfter: newGoldBalance,
          orderId,
        });
        
        // Add cash transaction for making charges
        if (totalMakingCharge > 0) {
          transactions.push({
            userId,
            type: "DEBIT",
            method: "CASH",
            amount: totalMakingCharge,
            balanceType: "CASH",
            balanceAfter: newCashBalance,
            orderId,
            description: "Making charges for gold order"
          });
        }
        
        // Add notifications for both transactions
        transactionNotificationMessages.push(`A gold payment of ${totalWeight.toFixed(
          3
        )} grams has been processed for your order #${orderId
          .toString()
          .slice(-6)}. Your new gold balance is ${newGoldBalance.toFixed(
          3
        )} grams.`);
        
        if (totalMakingCharge > 0) {
          transactionNotificationMessages.push(`A cash payment of ${totalMakingCharge.toFixed(
            2
          )} for making charges has been processed for your order #${orderId
            .toString()
            .slice(-6)}. Your new cash balance is ${newCashBalance.toFixed(2)}.`);
        }
      }

      if (Object.keys(updateOperation).length > 0) {
        await UsersModel.updateOne(
          { "users._id": userId },
          { $set: updateOperation },
          { session }
        );

        // Add all transaction notifications
        for (const message of transactionNotificationMessages) {
          await addNotification(userId, message);
        }
      }

      if (transactions.length > 0) {
        await TransactionModel.insertMany(transactions, { session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
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
export const rejectItemInOrder = async (orderId, itemId) => {
  try {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return {
        success: false,
        message: "Invalid Order ID or Item ID format"
      };
    }

    // Find the order
    const order = await orderModel.findById(orderId);
    
    if (!order) {
      return {
        success: false,
        message: "Order not found"
      };
    }
    
    // Find the specific item
    const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      return {
        success: false,
        message: "Item not found in the order"
      };
    }
    
    // Update the item status to rejected
    order.items[itemIndex].itemStatus = "Rejected";
    
    // Set the select property to true for the rejected item
    order.items[itemIndex].select = true;
    
    // Recalculate the total price by excluding the rejected item
    const rejectedItemPrice = order.items[itemIndex].fixedPrice * order.items[itemIndex].quantity;
    order.totalPrice = Math.max(0, order.totalPrice - rejectedItemPrice);
    
    // Calculate and update totalWeight
    const weightToSubtract = order.items[itemIndex].productWeight * order.items[itemIndex].quantity;
    order.totalWeight = Math.max(0, order.totalWeight - weightToSubtract);
    
    // If this is the only item in the order, update the order status to "Rejected"
    if (order.items.length === 1) {
      order.orderStatus = "Rejected";
    } else {
      // Check if all items are now rejected
      const allRejected = order.items.every(item => item.itemStatus === "Rejected");
      if (allRejected) {
        order.orderStatus = "Rejected";
      }
    }
    
    // Save the updated order
    await order.save();
    
    return {
      success: true,
      data: order,
      message: "Item rejected successfully"
    };
  } catch (error) {
    console.error("Error rejecting item:", error);
    return {
      success: false,
      message: error.message || "Internal server error"
    };
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

export const updateOrderQuantityHelper = async (orderId, orderDetails) => {
  try {
    let { itemStatus, itemId, quantity, fixedPrice } = orderDetails;
    // Determine if the quantity is greater than 1
    const isQuantityGreaterThanOne = quantity && quantity > 1;
    // Set default quantity to 1 if none provided or quantity is invalid (less than 1)
    if (!quantity || quantity < 1) {
      quantity = 1;
    }
    // Find the order by ID
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
    // Update the specific item's quantity, fixed price, and status
    order.items[itemIndex].quantity = quantity;
    order.items[itemIndex].fixedPrice = fixedPrice;
    order.items[itemIndex].itemStatus = itemStatus;
    // Recalculate total price for the order
    order.totalPrice = order.items.reduce(
      (total, item) => total + item.quantity * item.fixedPrice,
      0
    );
    // Check if all items are "Approved"
    const allApproved = order.items.every(
      (item) => item.itemStatus === "Approved"
    );
    // Check if any item has "User Approval Pending"
    const anyUserApprovalPending = order.items.some(
      (item) => item.itemStatus === "User Approval Pending"
    );

    let statusChanged = false;
    let previousStatus = order.orderStatus;

    // Update orderStatus based on items' statuses
    if (allApproved) {
      order.orderStatus = "Success";
    } else if (anyUserApprovalPending) {
      // Check if we're changing to "User Approval Pending" status
      statusChanged = order.orderStatus !== "User Approval Pending";
      order.orderStatus = "User Approval Pending";
      order.notificationSentAt = new Date();
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
            notificationMessage = `🎉 Congratulations! Your order #${order.transactionId} has been successfully processed and approved.`;
            break;
          case "User Approval Pending":
            notificationMessage = `🔔 Action Required: Please review and confirm the quantity (${quantity}) for an item in your order #${order.transactionId}.`;
            break;
          case "Processing":
            notificationMessage = `📦 Your order #${order.transactionId} is now being processed. We'll keep you updated on its progress.`;
            break;
          default:
            notificationMessage = `📝 Your order #${order.transactionId} status has been updated to: ${order.orderStatus}`;
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
              },
            ],
            createdBy: order.userId,
          });
          await userNotificationDoc.save();
        }

        console.log(
          `Order status change notification added for user ${order.userId}`
        );
      } catch (notificationError) {
        console.error(
          "Error creating order status notification:",
          notificationError.message
        );
        // Continue processing - notification failure shouldn't stop the order update
      }
    }

    // Send notification and email only if status changed to "User Approval Pending"
    if (order.orderStatus === "User Approval Pending" && statusChanged) {
      // Send FCM notifications
      let fcmTokenDoc = await UserFCMTokenModel.findOne({
        createdBy: order.userId,
      });
      if (fcmTokenDoc && fcmTokenDoc.FCMTokens.length > 0) {
        const invalidTokens = [];
        for (const tokenObj of fcmTokenDoc.FCMTokens) {
          try {
            await NotificationService.sendQuantityConfirmationNotification(
              tokenObj.token,
              orderId,
              itemId,
              quantity
            );
          } catch (error) {
            console.error(
              `Failed to send confirmation notification to token: ${tokenObj.token}`,
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
        // Remove invalid tokens if any were found
        if (invalidTokens.length > 0) {
          fcmTokenDoc.FCMTokens = fcmTokenDoc.FCMTokens.filter(
            (tokenObj) => !invalidTokens.includes(tokenObj.token)
          );
          await fcmTokenDoc.save();
        }
      }

      // Send confirmation email to user
      try {
        const emailResult = await sendQuantityConfirmationEmail(
          orderId,
          itemId,
          quantity
        );
        if (!emailResult.success) {
          console.error(
            "Failed to send confirmation email:",
            emailResult.error
          );
        }
      } catch (emailError) {
        console.error("Error in email sending process:", emailError);
        // Continue processing - email failure shouldn't stop the order update
      }
    }

    return {
      success: true,
      message: "Order updated successfully",
      data: order,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error updating order: " + error.message,
    };
  }
};

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
