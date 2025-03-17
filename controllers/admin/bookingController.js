import mongoose from "mongoose";
import nodemailer from "nodemailer";
import mjml2html from "mjml";
import dotenv from "dotenv";
import {
  fetchBookingDetails,
  updateOrderDetails,
  updateOrderQuantityHelper,
  updateOrderStatusHelper,
} from "../../helper/admin/bookingHelper.js";
import { orderModel } from "../../model/orderSchema.js";
import { UsersModel } from "../../model/usersSchema.js";
import adminModel from "../../model/adminSchema.js";

dotenv.config();
export const fetchBookings = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { message, success, orderDetails } = await fetchBookingDetails(
      adminId
    );
    if (!success || !orderDetails) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to place the order",
      });
    }
    return res.status(200).json({
      success: true,
      orderDetails, // Send the order details to the client
      message: "Orders fetching successfully.",
    });
  } catch (error) {
    next(error);
  }
};
export const updateOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;
    const { message, success, data } = await updateOrderDetails(
      orderId,
      orderStatus
    );
    if (!success || !data) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to place the order",
      });
    }
    return res.status(200).json({
      success: true,
      data, // Send the order details to the client
      message: "Order update successfully.",
    });
  } catch (error) {
    next(error);
  }
};
export const orderQuantityConfirmation = async (req, res, next) => {
  try {
    let { orderId, itemId, action } = req.body;

    action = action === "true";

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Oops! We couldn't find the order you're looking for.",
      });
    }

    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          "The item you are trying to update does not exist in the order.",
      });
    }

    if (item.select) {
      return res.status(400).json({
        success: true,
        message: `You have already ${item.itemStatus.toLowerCase()} this item. Further changes are not allowed.`,
      });
    }

    // Update item status based on action
    item.itemStatus = action ? "Approved" : "Rejected";
    item.select = true;

    // Determine overall order status
    const allApproved = order.items.every((i) => i.itemStatus === "Approved");
    const hasPendingItems = order.items.some(
      (i) => i.itemStatus === "User Approval Pending"
    );
    const hasApprovedItems = order.items.some(
      (i) => i.itemStatus === "Approved"
    );
    const hasRejectedItems = order.items.some(
      (i) => i.itemStatus === "Rejected"
    );

    // Update order status
    if (allApproved) {
      order.orderStatus = "Success"; // All items approved
    } else if (hasPendingItems) {
      order.orderStatus = "User Approval Pending";
    } else if (hasApprovedItems) {
      order.orderStatus = "Processing"; // At least one approved, still processing
    } else if (hasRejectedItems) {
      order.orderStatus = "Pending"; // Only rejected items exist
    }

    await order.save();

    // Send email notification based on the user's action
    const emailResult = await sendStatusConfirmationEmail(
      orderId,
      itemId,
      action
    );
    if (!emailResult.success) {
      console.error("Failed to send confirmation email:", emailResult.error);
    }

    let message;
    let success = true;

    if (item.itemStatus === "Rejected") {
      success = false;
      message = `❌ The item ${item.name} in your order ${order.transactionId} has been rejected.`;
    } else if (order.orderStatus === "Success") {
      message = `🎉 Congratulations! Your order (Transaction ID: ${order.transactionId}) has been fully approved!`;
    } else if (order.orderStatus === "User Approval Pending") {
      message = `⚠️ Your order ${order.transactionId} is awaiting approval for some items.`;
    } else if (order.orderStatus === "Processing") {
      message = `🔄 Your order ${order.transactionId} is still being processed. Some items are approved, while others are pending.`;
    } else {
      message = `⚠️ Your order ${order.transactionId} requires review due to rejected items.`;
    }

    return res.status(200).json({
      success,
      message,
    });
  } catch (error) {
    next(error);
  }
};

// Function to send emails for both approval and rejection cases
const sendStatusConfirmationEmail = async (orderId, itemId, isApproved) => {
  try {
    // Find the order with proper population
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Now populate the userId with proper fields
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

    // Get product details
    const product = await mongoose.model("Product").findById(item.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const productName = product.name || "Product";
    const productWeight = product.weight || 0;
    const totalWeight = productWeight * item.quantity;
    
    const admin = await adminModel.findById(order.adminId);
    const adminBrandName =
      admin && admin.companyName ? admin.companyName : "Aurify";

    // Email configuration
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
    });

    // Format price with comma separators for Indian Rupees
    const formattedPrice = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(item.fixedPrice);

    const totalPrice = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(item.fixedPrice * item.quantity);

    // Determine email content based on approval status
    let emailSubject, statusText, actionText, statusColor;

    if (isApproved) {
      emailSubject = `Quantity Request Approved - ${adminBrandName}`;
      statusText = "Quantity Request Approved";
      actionText = `Your requested quantity of ${item.quantity} units has been approved.`;
      statusColor = "#2E7D32"; // Dark green
    } else {
      emailSubject = `Quantity Request Declined - ${adminBrandName}`;
      statusText = "Quantity Request Declined";
      actionText = `Your requested quantity adjustment for this item has been declined.`;
      statusColor = "#C62828"; // Dark red
    }

    // Email content with professional MJML
    const mailOptions = {
      from: `"${adminBrandName}" <${
        process.env.EMAIL_USER || "aurifycontact@gmail.com"
      }>`,
      to: userEmail,
      subject: emailSubject,
      html: mjml2html(`
        <mjml>
          <mj-head>
            <mj-title>${statusText} - ${adminBrandName}</mj-title>
            <mj-attributes>
              <mj-all font-family="'Segoe UI', Arial, sans-serif" />
              <mj-section padding="0px" />
              <mj-column padding="0px" />
            </mj-attributes>
            <mj-style>
              .data-table {
                width: 100%;
                border-collapse: collapse;
              }
              .data-table th {
                background-color: #f2f2f2;
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #ddd;
                font-weight: 600;
              }
              .data-table td {
                padding: 10px;
                border-bottom: 1px solid #ddd;
              }
              .status-indicator {
                display: inline-block;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-right: 6px;
              }
              .footer-link {
                color: #555555;
                text-decoration: none;
              }
            </mj-style>
          </mj-head>
          
          <mj-body background-color="#f9f9f9">
            <!-- Header -->
            <mj-section background-color="#ffffff" padding="20px 0">
              <mj-column>
                <mj-text font-size="22px" font-weight="700" align="center" color="#333333">
                  ${adminBrandName}
                </mj-text>
              </mj-column>
            </mj-section>
            
            <!-- Title Bar -->
            <mj-section background-color="${statusColor}" padding="15px 0">
              <mj-column>
                <mj-text font-size="16px" font-weight="600" align="center" color="#ffffff">
                  ${statusText}
                </mj-text>
              </mj-column>
            </mj-section>

            <!-- Order Information -->
            <mj-section background-color="#ffffff" padding="20px">
              <mj-column>
                <mj-text font-size="14px" color="#555555" padding-bottom="10px">
                  <strong>Order #:</strong> ${order.transactionId}
                </mj-text>
                <mj-text font-size="14px" color="#555555" padding-bottom="10px">
                  <strong>Order Status:</strong> ${order.orderStatus}
                </mj-text>
                <mj-text font-size="14px" color="#555555" padding-bottom="20px">
                  <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
                </mj-text>
                
                <mj-divider border-color="#eeeeee" padding="0 0 20px" />
                
                <!-- Greeting -->
                <mj-text font-size="16px" color="#333333" padding-bottom="15px">
                  Dear ${userName},
                </mj-text>
                
                <mj-text font-size="14px" color="#555555" line-height="1.5" padding-bottom="20px">
                  ${actionText} Please find the details below.
                </mj-text>
                
                <!-- Product Information Table -->
                <mj-section padding="0 0 20px">
                  <mj-column>
                    <mj-table css-class="data-table">
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Weight</th>
                        <th>Price</th>
                      </tr>
                      <tr>
                        <td>${productName}</td>
                        <td>${item.quantity}</td>
                        <td>${productWeight}g × ${item.quantity} = ${totalWeight}g</td>
                        <td>₹${formattedPrice} × ${item.quantity} = ₹${totalPrice}</td>
                      </tr>
                    </mj-table>
                  </mj-column>
                </mj-section>
                
                <!-- Next Steps -->
                <mj-section padding="20px 0">
                  <mj-column>
                    <mj-text font-size="16px" font-weight="600" color="#333333" padding-bottom="10px">
                      Next Steps
                    </mj-text>
                    <mj-text font-size="14px" color="#555555" line-height="1.5">
                      ${
                        isApproved
                          ? `• Your request for ${item.quantity} units has been approved and updated in our system.<br>
                          • Our team will process your order with the new quantity.<br>
                          • You will receive a shipping confirmation when your order is dispatched.`
                          : `• Your item will remain at the original quantity.<br>
                          • If you wish to make any changes, please contact our customer service team.<br>
                          • Your order will continue processing with the original configuration.`
                      }
                    </mj-text>
                  </mj-column>
                </mj-section>
                
                <mj-divider border-color="#eeeeee" padding="0 0 20px" />
                
                <!-- Contact Support -->
                <mj-text font-size="14px" color="#555555" line-height="1.5">
                  If you have any questions regarding your order, please contact our customer service team at ${
                    admin.email || "support@aurify.com"
                  } or call ${admin.contact || "our support line"}.
                </mj-text>
                
                <mj-text font-size="14px" color="#555555" line-height="1.5" padding-top="15px">
                  Thank you for your business.
                </mj-text>
                
                <mj-text font-size="14px" color="#555555" line-height="1.5" padding-top="5px">
                  Regards,<br>
                  ${adminBrandName} Team
                </mj-text>
              </mj-column>
            </mj-section>
            
            <!-- Footer -->
            <mj-section background-color="#f2f2f2" padding="15px">
              <mj-column>
                <mj-text font-size="12px" color="#666666" align="center">
                  © ${new Date().getFullYear()} ${adminBrandName}. All Rights Reserved.
                </mj-text>
                <mj-text font-size="12px" color="#666666" align="center" padding-top="5px">
                  Business Hours: Monday-Friday, 9AM-6PM IST
                </mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `).html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `${isApproved ? "Approval" : "Rejection"} confirmation email sent:`,
      info.messageId
    );

    return {
      success: true,
      message: `${
        isApproved ? "Approval" : "Rejection"
      } confirmation email sent successfully`,
    };
  } catch (error) {
    console.error(
      `Error sending ${
        isApproved ? "approval" : "rejection"
      } confirmation email:`,
      error
    );
    return {
      success: false,
      message: `Error sending ${
        isApproved ? "approval" : "rejection"
      } confirmation email`,
      error: error.message,
    };
  }
};

export const updateOrderQuantity = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const orderDetails = req.body;
    const { message, success, data } = await updateOrderQuantityHelper(
      orderId,
      orderDetails
    );
    if (!success || !data) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to place the order",
      });
    }
    return res.status(200).json({
      success: true,
      data, // Send the order details to the client
      message: "Order update successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const orderDetails = req.body;
    const { message, success, data } = await updateOrderStatusHelper(
      orderId,
      orderDetails
    );
    if (!success || !data) {
      return res.status(404).json({
        success: false,
        message: message || "Failed to place the order",
      });
    }
    return res.status(200).json({
      success: true,
      data, // Send the order details to the client
      message: "Order update successfully.",
    });
  } catch (error) {
    next(error);
  }
};
