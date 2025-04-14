import { orderModel } from "../model/orderSchema.js";
import mjml2html from "mjml";
import nodemailer from "nodemailer";
import { UsersModel } from "../model/usersSchema.js";
import mongoose from "mongoose";
import adminModel from "../model/adminSchema.js";
export const sendQuantityConfirmationEmail = async (
  orderId,
  itemId,
  quantity,
  isAutoReject = false
) => {
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

    // First, add the approveUrl and rejectUrl as you specified
    const baseUrl = "https://nova-email-confirmation.onrender.com";
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

    // Determine email subject and content based on auto-reject status
    let emailSubject, urgentMessage;

    if (isAutoReject) {
      // Auto-Reject Email
      emailSubject = "❌ Order Automatically Canceled - No Response";
      urgentMessage = `
          <mj-section background-color="#FFE5E5" padding="15px" margin="20px 0">
            <mj-column>
              <mj-text font-size="18px" font-weight="bold" color="#FF4136" align="center">
                🚫 ORDER AUTOMATICALLY CANCELED
              </mj-text>
              <mj-text font-size="16px" color="#2C3E50" align="center">
                Your order was canceled due to no response within the specified time frame.
              </mj-text>
            </mj-column>
          </mj-section>
        `;
    } else {
      // Original notification logic (from previous implementation)
      const currentTime = new Date();
      const timeSinceNotification = order.notificationSentAt
        ? (currentTime - order.notificationSentAt) / (1000 * 60)
        : 0;

      emailSubject =
        timeSinceNotification >= 5
          ? "⏰ URGENT: Immediate Action Required"
          : "🌟 Exclusive Order Quantity Confirmation";

      urgentMessage =
        timeSinceNotification >= 5
          ? `
            <mj-section background-color="#FFE5E5" padding="15px" margin="20px 0">
              <mj-column>
                <mj-text font-size="18px" font-weight="bold" color="#FF4136" align="center">
                  ⚠️ FINAL NOTICE: Immediate Response Needed
                </mj-text>
                <mj-text font-size="16px" color="#2C3E50" align="center">
                  Your order will be <span style="color: #FF4136; font-weight: bold;">AUTO-CANCELED</span> if not confirmed within the next few minutes.
                </mj-text>
                <mj-button background-color="#4CAF50" color="white" href="${approveUrl}" border-radius="5px" font-weight="bold" width="200px" margin="10px auto">
                  APPROVE QUANTITY
                </mj-button>
                <mj-button background-color="#FF4136" color="white" href="${rejectUrl}" border-radius="5px" font-weight="bold" width="200px" margin="5px auto">
                  REJECT ORDER
                </mj-button>
              </mj-column>
            </mj-section>
          `
          : `
            <mj-section background-color="#FFF5E6" padding="15px" margin="20px 0">
              <mj-column>
                <mj-text font-size="18px" font-weight="bold" color="#FF7F50" align="center">
                  ⏰ Confirmation Countdown Initiated
                </mj-text>
                <mj-text font-size="16px" color="#2C3E50" align="center">
                  Please confirm your order quantity <span style="color: #FF7F50; font-weight: bold;">SOON</span> to avoid auto-cancellation.
                </mj-text>
                <mj-button background-color="#4CAF50" color="white" href="${approveUrl}" border-radius="5px" font-weight="bold" width="200px" margin="10px auto">
                  APPROVE QUANTITY
                </mj-button>
                <mj-button background-color="#FF4136" color="white" href="${rejectUrl}" border-radius="5px" font-weight="bold" width="200px" margin="5px auto">
                  REJECT ORDER
                </mj-button>
              </mj-column>
            </mj-section>
          `;
    }

    // Email content with enhanced MJML
    const mailOptions = {
      from: `"${adminBrandName} Precious Metals" <aurifycontact@gmail.com>`,
      to: userEmail,
      subject: `${emailSubject} - ${adminBrandName}`,
      html: mjml2html(`
          <mjml>
            <mj-head>
              <mj-title>${emailSubject} - ${adminBrandName}</mj-title>
              <mj-attributes>
                <mj-all font-family="'Optima', 'Palatino Linotype', serif" />
                <mj-class name="gold-gradient" background-color="#D4AF37" color="#FFFFFF" />
                <mj-class name="metallic-border" border="2px solid #D4AF37" border-radius="15px" />
              </mj-attributes>
              <mj-style>
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
              <mj-section background-color="#D4AF37" padding="40px 20px">
                <mj-column>
                  <mj-text font-size="28px" font-weight="bold" align="center" color="#FFFFFF" letter-spacing="2px">
                    ${emailSubject}
                  </mj-text>
                  <mj-text font-size="16px" align="center" color="#F0E68C" padding-top="10px">
                    ${adminBrandName} Precious Metals Collection
                  </mj-text>
                </mj-column>
              </mj-section>
  
              <!-- Main Content Area -->
              <mj-section background-color="#FFFFFF" border="2px solid #D4AF37" border-radius="15px" padding="30px" margin="20px">
                <mj-column>
                  <!-- Personalized Greeting -->
                  <mj-text font-size="20px" font-weight="bold" color="#2C3E50" padding-bottom="20px">
                    Dear ${userName},
                  </mj-text>
  
                  <mj-text font-size="16px" color="#34495E" line-height="1.6">
                    ${
                      isAutoReject
                        ? "We regret to inform you that your order has been automatically canceled due to no response."
                        : "We are reaching out regarding a refined adjustment to your recent order of precious metals with " +
                          adminBrandName +
                          "."
                    }
                  </mj-text>
  
                  <!-- Urgency Message (Conditional) -->
                  ${urgentMessage}
  
                  <!-- Attention Grabbing Notice -->
                  <mj-section background-color="#FFF5E6" padding="15px" margin="20px 0">
                    <mj-column>
                      <mj-text font-size="18px" font-weight="bold" color="#D4AF37" align="center">
                        ${
                          isAutoReject
                            ? "❌ Order Canceled"
                            : "🔔 Order Quantity Update Required"
                        }
                      </mj-text>
                      <mj-text font-size="16px" color="#2C3E50" align="center">
                        ${
                          isAutoReject
                            ? "Your order could not be processed due to no confirmation."
                            : `Your original order of 1 item requires an adjustment to <span style="color: #D4AF37; font-weight: bold;">${quantity} items</span>`
                        }
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
      message: isAutoReject
        ? "Auto-reject email sent successfully"
        : "Quantity confirmation email sent successfully",
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
