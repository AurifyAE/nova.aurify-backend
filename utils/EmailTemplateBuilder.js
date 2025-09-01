import mongoose from "mongoose";
import nodemailer from "nodemailer";
import mjml2html from "mjml";
import EnhancedNotificationService from "./sendPushNotification.js";
import Notification from "../model/notificationSchema.js";
import userNotification from "../model/userNotificationSchema.js";
import FCMTokenModel from "../model/fcmTokenSchema.js";
import UserFCMTokenModel from "../model/userFCMToken.js";
import Product from "../model/productSchema.js";

// Dynamic Email Template Builder
class DynamicEmailTemplateBuilder {
  static buildOrderStatusEmail(
    orderData,
    userData,
    adminData,
    statusType,
    additionalData = {}
  ) {
    const templates = {
      order_placed: this.buildOrderPlacedTemplate,
      approved: this.buildApprovedTemplate, // Item approved template
      item_approved: this.buildApprovedTemplate, // Alias for item approved
      item_rejected: this.buildItemRejectedTemplate, // Item rejected template
      item_reject: this.buildItemRejectedTemplate, // Alias for item rejected
      approvel: this.buildApprovelTemplate,
      user_approvel_pending: this.buildUserApprovelPendingTemplate,
      pending: this.buildPendingTemplate,
      processing: this.buildProcessingTemplate,
      scusess: this.buildScusessTemplate,
      reject: this.buildRejectTemplate,
    };

    const templateFunction = templates[statusType.toLowerCase()];
    if (!templateFunction) {
      throw new Error(`Template not found for status: ${statusType}`);
    }

    return templateFunction.call(
      this,
      orderData,
      userData,
      adminData,
      additionalData
    );
  }

  static buildBaseTemplate(orderData, userData, adminData, config) {
    const user = userData.users[0];
    const adminBrandName = adminData?.companyName || "Aurify";

    const formattedTotalPrice = new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2,
    }).format(orderData.totalPrice);

    let orderItemsHTML = "";
    if (orderData.items && orderData.items.length > 0) {
      orderItemsHTML = orderData.items
        .map((item) => {
          const formattedPrice = new Intl.NumberFormat("en-AE", {
            style: "currency",
            currency: "AED",
          }).format(item.fixedPrice || 0);

          const formattedItemTotal = new Intl.NumberFormat("en-AE", {
            style: "currency",
            currency: "AED",
          }).format(item.totalPrice || 0);

          return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #E0E0E0;">${
              item.productName || "Product"
            }</td>
            <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; text-align: center;">${
              item.quantity || 0
            }</td>
            <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; text-align: right;">${
              item.productWeight || 0
            }g</td>
            <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; text-align: right;">${formattedPrice}</td>
            <td style="padding: 12px; border-bottom: 1px solid #E0E0E0; text-align: right;">${formattedItemTotal}</td>
          </tr>`;
        })
        .join("");
    }

    return mjml2html(`
      <mjml>
        <mj-head>
          <mj-title>${config.title} - ${adminBrandName}</mj-title>
          <mj-attributes>
            <mj-all font-family="'Segoe UI', Arial, sans-serif" />
          </mj-attributes>
          <mj-style>
            .header-gold { background: linear-gradient(135deg, #D4AF37 0%, #F5E7A0 50%, #D4AF37 100%); }
            .status-badge { background-color: ${
              config.badgeColor
            }; color: white; padding: 8px 15px; border-radius: 6px; font-weight: bold; font-size: 14px; }
            .order-summary { background-color: #FAFAFA; border-radius: 8px; border-left: 4px solid ${
              config.accentColor
            }; }
            .content-section { background-color: ${
              config.sectionBg || "#FFFFFF"
            }; }
            .action-section { background-color: ${
              config.actionBg || "#FFF8E1"
            }; }
          </mj-style>
        </mj-head>
        <mj-body background-color="#F9F9F9">
          <mj-section css-class="header-gold" padding="20px 0">
            <mj-column>
              <mj-text font-size="26px" font-weight="bold" align="center" color="#333333">${adminBrandName}</mj-text>
              <mj-text font-size="16px" align="center" color="#333333" font-style="italic">Precious Metals</mj-text>
            </mj-column>
          </mj-section>
          <mj-section css-class="content-section" padding="15px 0">
            <mj-column>
              <mj-text align="center" font-size="14px">
                <span class="status-badge">${config.badgeText}</span>
              </mj-text>
            </mj-column>
          </mj-section>
          <mj-section css-class="content-section" padding="20px">
            <mj-column>
              <mj-text font-size="18px" font-weight="bold" color="#333333">Dear ${
                user.name
              },</mj-text>
              <mj-text font-size="16px" color="#555555" line-height="1.5" padding-bottom="15px">${
                config.mainMessage
              }</mj-text>
              <mj-section css-class="order-summary" padding="15px" margin="15px 0">
                <mj-column>
                  <mj-text font-size="16px" font-weight="bold" color="#333333">📋 Order Information</mj-text>
                  <mj-text font-size="14px" color="#555555" line-height="1.6">
                    <strong>🔢 Order ID:</strong> ${orderData.transactionId}<br>
                    <strong>📅 Date:</strong> ${new Date(
                      orderData.createdAt || Date.now()
                    ).toLocaleDateString("en-AE")}<br>
                    <strong>💳 Payment Method:</strong> ${
                      orderData.paymentMethod
                    }<br>
                    <strong>⚖️ Total Weight:</strong> ${
                      orderData.totalWeight
                    }g<br>
                    <strong>💰 Total Amount:</strong> ${formattedTotalPrice}<br>
                    <strong>📊 Current Status:</strong> <span style="color: ${
                      config.statusColor
                    }; font-weight: bold;">${config.currentStatus}</span>
                    ${
                      config.isAdminCopy && config.customerName
                        ? `<br><strong>👤 Customer Name:</strong> ${config.customerName}`
                        : ""
                    }
                  </mj-text>
                </mj-column>
              </mj-section>
              ${
                orderItemsHTML
                  ? `
              <mj-text font-size="16px" font-weight="bold" color="#333333" padding-bottom="10px">📦 Order Items</mj-text>
              <mj-table>
                <tr style="background-color: #F5F5F5;">
                  <th style="padding: 12px; text-align: left;">Product</th>
                  <th style="padding: 12px; text-align: center;">Qty</th>
                  <th style="padding: 12px; text-align: right;">Weight</th>
                  <th style="padding: 12px; text-align: right;">Price</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
                ${orderItemsHTML}
                <tr style="background-color: #FFF8E1;">
                  <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold;">Grand Total:</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold; color: #D4AF37;">${formattedTotalPrice}</td>
                </tr>
              </mj-table>
              `
                  : ""
              }
              ${
                config.additionalInfo
                  ? `
              <mj-text font-size="14px" color="#666666" line-height="1.5" padding-top="15px">${config.additionalInfo}</mj-text>
              `
                  : ""
              }
              ${
                config.nextSteps
                  ? `
              <mj-text font-size="16px" font-weight="bold" color="#333333" padding-top="20px">${
                config.nextStepsTitle || "🚀 What's Next?"
              }</mj-text>
              <mj-text font-size="14px" color="#555555" line-height="1.5">${
                config.nextSteps
              }</mj-text>
              `
                  : ""
              }
            </mj-column>
          </mj-section>
          ${
            config.actionSection
              ? `
          <mj-section css-class="action-section" padding="20px">
            <mj-column>
              <mj-text font-size="18px" font-weight="bold" align="center" color="${config.accentColor}">${config.actionTitle}</mj-text>
              <mj-text font-size="14px" color="#555555" align="center" line-height="1.5">${config.actionMessage}</mj-text>
            </mj-column>
          </mj-section>
          `
              : ""
          }
          <mj-section background-color="#FFFFFF" padding="20px" border-radius="8px" margin-top="10px">
            <mj-column>
              <mj-text font-size="16px" font-weight="bold" color="#333333" align="center">📞 Need Help? Contact Us</mj-text>
              <mj-divider border-color="#EEEEEE" padding="10px 0" />
              <mj-text font-size="14px" color="#555555" align="center" line-height="1.5">
                <strong>📧 Email:</strong> ${
                  adminData?.email || "support@aurify.com"
                }<br>
                <strong>📱 Phone:</strong> ${
                  adminData?.contact || "+971-XXX-XXXX"
                }<br>
                <strong>🕒 Hours:</strong> Sunday-Thursday, 9AM-6PM GST
              </mj-text>
            </mj-column>
          </mj-section>
          <mj-section background-color="#333333" padding="20px">
            <mj-column>
              <mj-text color="#FFFFFF" font-size="16px" align="center" font-weight="bold">${adminBrandName} Precious Metals</mj-text>
              <mj-text color="#D4AF37" font-size="12px" align="center" font-style="italic" padding-top="5px">Quality and Trust Since 2020</mj-text>
              <mj-text color="#AAAAAA" font-size="11px" align="center" padding-top="15px">© ${new Date().getFullYear()} ${adminBrandName} Precious Metals. All Rights Reserved.</mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `).html;
  }

  static buildOrderPlacedTemplate(
    orderData,
    userData,
    adminData,
    additionalData
  ) {
    const config = {
      title: "Order Placed",
      badgeText: "ORDER PLACED 🎉",
      badgeColor: "#4CAF50",
      accentColor: "#4CAF50",
      statusColor: "#4CAF50",
      currentStatus: "Order Placed",
      mainMessage: additionalData.isAdminCopy
        ? `🎉 A new order has been placed by ${additionalData.customerName} (Email: ${additionalData.customerEmail}). It is now being processed.`
        : "🎉 Thank you for your order! It has been successfully placed and is now being processed.",
      additionalInfo: additionalData?.orderNote
        ? `<strong>📝 Order Note:</strong> ${additionalData.orderNote}`
        : additionalData.isAdminCopy
        ? `Please review the order details for ${additionalData.customerName}.`
        : "We will review your order and provide updates soon.",
      nextSteps:
        "1️⃣ Order review by our team<br>2️⃣ Confirmation of product availability<br>3️⃣ Payment processing<br>4️⃣ Order preparation<br>5️⃣ Shipping updates",
      actionSection: true,
      actionTitle: additionalData.isAdminCopy
        ? "🚀 New Order Received!"
        : "🚀 Your Order is On Its Way!",
      actionMessage: additionalData.isAdminCopy
        ? `Please proceed with the review and processing of this order for ${additionalData.customerName}.`
        : "We'll keep you updated on the status of your order. Thank you for choosing us!",
      isAdminCopy: additionalData.isAdminCopy || false,
      customerName: additionalData.customerName,
      customerEmail: additionalData.customerEmail,
    };
    return this.buildBaseTemplate(orderData, userData, adminData, config);
  }

  // NEW: Item Approved Template
  static buildApprovedTemplate(orderData, userData, adminData, additionalData) {
    const config = {
      title: "Item Approved",
      badgeText: "ITEM APPROVED ✅",
      badgeColor: "#4CAF50",
      accentColor: "#4CAF50",
      statusColor: "#4CAF50",
      currentStatus: "Item Approved",
      mainMessage: additionalData?.itemDetails
        ? `🎉 Great news! Your item "${additionalData.itemDetails.productName}" has been approved and is now part of your order processing.`
        : additionalData?.customMessage
        ? additionalData.customMessage
        : "🎉 Great news! Your order item has been approved and is now being processed.",
      additionalInfo: additionalData?.approvalNote
        ? `<strong>📝 Approval Note:</strong> ${additionalData.approvalNote}`
        : additionalData?.itemDetails
        ? `<strong>✅ Approved Item:</strong> ${
            additionalData.itemDetails.productName
          } (Qty: ${
            additionalData.itemDetails.quantity
          }, Price: ${new Intl.NumberFormat("en-AE", {
            style: "currency",
            currency: "AED",
          }).format(additionalData.itemDetails.price || 0)})`
        : "Your item has been successfully approved by our team.",
      nextSteps: additionalData?.itemDetails?.totalValue
        ? `1️⃣ Item approved and added to processing queue<br>2️⃣ Payment processing for approved items<br>3️⃣ Quality check and preparation<br>4️⃣ Packaging and shipping arrangement<br>5️⃣ Tracking information will be provided`
        : "1️⃣ Item moved to processing<br>2️⃣ Quality verification<br>3️⃣ Preparation for shipping<br>4️⃣ Updates will follow",
      actionSection: true,
      actionTitle: "🚀 Your Item is Approved!",
      actionMessage:
        additionalData?.approvalType === "item_approved"
          ? "Thank you for confirming! Your approved item is now being processed with care."
          : "Your item approval has been confirmed and processing will begin shortly.",
    };
    return this.buildBaseTemplate(orderData, userData, adminData, config);
  }

  // NEW: Item Rejected Template
  static buildItemRejectedTemplate(
    orderData,
    userData,
    adminData,
    additionalData
  ) {
    const config = {
      title: "Item Rejected",
      badgeText: "ITEM REJECTED ⚠️",
      badgeColor: "#F44336",
      accentColor: "#F44336",
      statusColor: "#F44336",
      sectionBg: "#FFF5F5",
      actionBg: "#FFEBEE",
      currentStatus: "Item Rejected",
      mainMessage: additionalData?.itemDetails
        ? `⚠️ Your item "${additionalData.itemDetails.productName}" in order #${orderData.transactionId} has been rejected.`
        : additionalData?.customMessage
        ? additionalData.customMessage
        : "⚠️ An item in your order has been rejected. Please review the details below.",
      additionalInfo: additionalData?.rejectionReason
        ? `<strong>📋 Rejection Reason:</strong> ${additionalData.rejectionReason}`
        : additionalData?.itemDetails
        ? `<strong>❌ Rejected Item:</strong> ${
            additionalData.itemDetails.productName
          } (Qty: ${
            additionalData.itemDetails.quantity
          })<br><strong>📋 Reason:</strong> ${
            additionalData.itemDetails.rejectionReason ||
            "Please contact support for details"
          }`
        : "Please contact our support team for detailed information about the rejection.",
      nextSteps:
        additionalData?.allowResubmission !== false
          ? "1️⃣ Review the rejection feedback<br>2️⃣ Contact support for clarification if needed<br>3️⃣ Modify item specifications if required<br>4️⃣ Resubmit for approval<br>5️⃣ Consider alternative product options"
          : "1️⃣ Review the rejection feedback<br>2️⃣ Contact support for clarification<br>3️⃣ Consider alternative product options<br>4️⃣ Browse our available inventory<br>5️⃣ Place a new order if needed",
      actionSection: true,
      actionTitle: "🤝 Let's Resolve This Together",
      actionMessage: additionalData?.supportContact
        ? `Our support team is ready to help you resolve this issue. Contact us at ${additionalData.supportContact}`
        : "Our support team is ready to help you resolve this issue and find suitable alternatives.",
    };
    return this.buildBaseTemplate(orderData, userData, adminData, config);
  }

  static buildApprovelTemplate(orderData, userData, adminData, additionalData) {
    const config = {
      title: "Order Approved",
      badgeText: "ORDER APPROVED ✅",
      badgeColor: "#2E7D32",
      accentColor: "#2E7D32",
      statusColor: "#2E7D32",
      currentStatus: "Approved",
      mainMessage:
        "🎉 Great news! Your order has been approved and is now moving to the next stage of processing.",
      additionalInfo: additionalData?.approvalNote
        ? `<strong>📝 Approval Note:</strong> ${additionalData.approvalNote}`
        : null,
      nextSteps:
        "1️⃣ Payment processing will begin shortly<br>2️⃣ Items will be prepared and packaged<br>3️⃣ Quality check and verification<br>4️⃣ Shipping arrangement<br>5️⃣ Tracking information will be provided",
      actionSection: true,
      actionTitle: "🚀 Your Order is Moving Forward",
      actionMessage:
        "We're excited to process your approved order and deliver your precious metals soon!",
    };
    return this.buildBaseTemplate(orderData, userData, adminData, config);
  }

  static buildUserApprovelPendingTemplate(
    orderData,
    userData,
    adminData,
    additionalData
  ) {
    const config = {
      title: "User Approval Pending",
      badgeText: "USER APPROVAL PENDING ⏳",
      badgeColor: "#FF9800",
      accentColor: "#FF9800",
      statusColor: "#FF9800",
      currentStatus: "User Approval Pending",
      mainMessage:
        "⏳ Your order requires your confirmation. Please review the details and confirm to proceed.",
      additionalInfo: additionalData?.pendingReason
        ? `<strong>📋 Reason:</strong> ${additionalData.pendingReason}`
        : "Please check your order details and confirm at your earliest convenience.",
      nextSteps:
        "1️⃣ Review order details<br>2️⃣ Confirm or update quantity<br>3️⃣ Submit confirmation<br>4️⃣ Order moves to processing<br>5️⃣ Receive further updates",
      actionSection: true,
      actionTitle: "⚡ Action Required",
      actionMessage: "Please confirm your order to proceed with processing.",
    };
    return this.buildBaseTemplate(orderData, userData, adminData, config);
  }

  static buildPendingTemplate(orderData, userData, adminData, additionalData) {
    const config = {
      title: "Order Under Review",
      badgeText: "ORDER PENDING REVIEW 🔄",
      badgeColor: "#FF9800",
      accentColor: "#FF9800",
      statusColor: "#FF9800",
      currentStatus: "Pending",
      mainMessage:
        "⏳ Your order is currently under review by our team. We're carefully checking all details to ensure everything meets our quality standards.",
      additionalInfo: additionalData?.estimatedReviewTime
        ? `<strong>⏰ Estimated Review Time:</strong> ${additionalData.estimatedReviewTime}`
        : "Our team typically reviews orders within 24-48 hours during business days.",
      nextSteps:
        "1️⃣ Order details verification in progress<br>2️⃣ Product availability confirmation<br>3️⃣ Price and specification review<br>4️⃣ Quality standards check<br>5️⃣ Approval or feedback notification",
      actionSection: true,
      actionTitle: "⏱️ Review in Progress",
      actionMessage:
        "Thank you for your patience. We'll notify you as soon as the review is complete.",
    };
    return this.buildBaseTemplate(orderData, userData, adminData, config);
  }

  static buildProcessingTemplate(
    orderData,
    userData,
    adminData,
    additionalData
  ) {
    const config = {
      title: "Order Being Processed",
      badgeText: "ORDER PROCESSING 🔧",
      badgeColor: "#3F51B5",
      accentColor: "#3F51B5",
      statusColor: "#3F51B5",
      currentStatus: "Processing",
      mainMessage:
        "🔧 Your order is now being processed! Our craftsmen are carefully preparing your precious metals order.",
      additionalInfo: additionalData?.estimatedCompletion
        ? `<strong>📅 Estimated Completion:</strong> ${additionalData.estimatedCompletion}`
        : null,
      nextSteps:
        "1️⃣ Materials preparation and quality check<br>2️⃣ Professional crafting and finishing<br>3️⃣ Final quality inspection<br>4️⃣ Secure packaging<br>5️⃣ Ready for shipping notification",
      actionSection: true,
      actionTitle: "⚡ Active Processing",
      actionMessage:
        "Your order is in expert hands. We'll keep you updated on the progress!",
    };
    return this.buildBaseTemplate(orderData, userData, adminData, config);
  }

  static buildScusessTemplate(orderData, userData, adminData, additionalData) {
    const config = {
      title: "Order Successful",
      badgeText: "ORDER SUCCESSFUL ✅",
      badgeColor: "#4CAF50",
      accentColor: "#4CAF50",
      statusColor: "#4CAF50",
      currentStatus: "Successful",
      mainMessage:
        "🎉 Congratulations! Your order has been successfully completed. We hope you love your precious metals!",
      additionalInfo: additionalData?.deliveryDate
        ? `<strong>📅 Completed On:</strong> ${additionalData.deliveryDate}`
        : null,
      nextSteps:
        "1️⃣ Inspect your items carefully<br>2️⃣ Verify everything matches your order<br>3️⃣ Store items securely<br>4️⃣ Share your feedback with us<br>5️⃣ Consider us for future purchases",
      actionSection: true,
      actionTitle: "💝 Thank You for Your Business",
      actionMessage:
        "We'd love to hear about your experience! Please consider leaving a review.",
    };
    return this.buildBaseTemplate(orderData, userData, adminData, config);
  }

  static buildRejectTemplate(orderData, userData, adminData, additionalData) {
    const config = {
      title: "Order Rejected",
      badgeText: "ORDER REJECTED ⚠️",
      badgeColor: "#F44336",
      accentColor: "#F44336",
      statusColor: "#F44336",
      sectionBg: "#FFF5F5",
      actionBg: "#FFEBEE",
      currentStatus: "Rejected",
      mainMessage:
        "⚠️ Your order has been rejected. Please review the details or contact support for more information.",
      additionalInfo: additionalData?.rejectionReason
        ? `<strong>📋 Reason:</strong> ${additionalData.rejectionReason}`
        : "Please contact our support team for detailed information about the rejection.",
      nextSteps:
        "1️⃣ Review the feedback from our team<br>2️⃣ Contact support for clarification<br>3️⃣ Modify order if needed<br>4️⃣ Resubmit for approval<br>5️⃣ Alternative product suggestions available",
      actionSection: true,
      actionTitle: "🤝 Let's Resolve This Together",
      actionMessage:
        "Our support team is ready to help you resolve this issue.",
    };
    return this.buildBaseTemplate(orderData, userData, adminData, config);
  }
}

// Enhanced Dynamic Email Service with Admin Email Support
class DynamicEmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      pool: true,
      maxConnections: 5,
      rateDelta: 20000,
      rateLimit: 5,
    });
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  async sendOrderStatusEmail(
    orderData,
    userData,
    adminData,
    statusType,
    additionalData = {},
    retryAttempt = 0
  ) {
    try {
      if (!userData?.users?.length) {
        throw new Error("No user data provided");
      }
      const user = userData.users[0];
      const adminBrandName = adminData?.companyName || "Aurify";

      const emailConfigs = {
        order_placed: {
          subject: `🎉 Order Placed - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "🎉",
        },
        approved: {
          subject: `✅ Item Approved - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "✅",
        },
        item_approved: {
          subject: `✅ Item Approved - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "✅",
        },
        item_rejected: {
          subject: `⚠️ Item Rejected - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "⚠️",
        },
        item_reject: {
          subject: `⚠️ Item Rejected - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "⚠️",
        },
        approvel: {
          subject: `✅ Order Approved - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "✅",
        },
        user_approvel_pending: {
          subject: `⏳ User Approval Pending - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "⏳",
        },
        pending: {
          subject: `🔄 Order Under Review - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "🔄",
        },
        processing: {
          subject: `🔧 Order Processing - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "🔧",
        },
        scusess: {
          subject: `✅ Order Successful - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "✅",
        },
        reject: {
          subject: `⚠️ Order Rejected - ${adminBrandName} Order #${orderData.transactionId}`,
          emoji: "⚠️",
        },
      };

      const config = emailConfigs[statusType.toLowerCase()];
      if (!config) {
        throw new Error(
          `Email configuration not found for status: ${statusType}`
        );
      }

      // Validate and populate orderData
      const validatedOrderData = {
        transactionId: orderData.transactionId || "N/A",
        paymentMethod: orderData.paymentMethod || "N/A",
        totalWeight: orderData.totalWeight || 0,
        totalPrice: orderData.totalPrice || 0,
        createdAt: orderData.createdAt || new Date(),
        items: Array.isArray(orderData.items) ? orderData.items : [],
        _id: orderData._id || mongoose.Types.ObjectId(),
      };

      // Populate item details
      let orderWithDetails = { ...validatedOrderData };
      if (validatedOrderData.items.length > 0) {
        const orderItemsWithDetails = await Promise.all(
          validatedOrderData.items.map(async (item) => {
            if (item.productName && item.productWeight) return item;
            try {
              const product = await Product.findById(item.productId);
              return {
                ...item,
                productName: product
                  ? product.title
                  : item.productName || "Unknown Product",
                productWeight: product
                  ? product.weight
                  : item.productWeight || 0,
                quantity: item.quantity || 1,
                fixedPrice: product ? product.price : item.fixedPrice || 0,
                totalPrice:
                  (item.quantity || 1) *
                  (product ? product.price : item.fixedPrice || 0),
              };
            } catch (error) {
              console.warn(
                `Could not fetch product details for ${item.productId}:`,
                error.message
              );
              return {
                ...item,
                productName: item.productName || "Unknown Product",
                productWeight: item.productWeight || 0,
                quantity: item.quantity || 1,
                fixedPrice: item.fixedPrice || 0,
                totalPrice: (item.quantity || 1) * (item.fixedPrice || 0),
              };
            }
          })
        );
        orderWithDetails = {
          ...validatedOrderData,
          items: orderItemsWithDetails,
        };
      }

      const emailHTML = DynamicEmailTemplateBuilder.buildOrderStatusEmail(
        orderWithDetails,
        userData,
        adminData,
        statusType,
        additionalData
      );

      // Build recipients array
      const recipients = [user.email];

      // Add admin service email if provided and different from user email
      if (adminData?.serviceEmail && adminData.serviceEmail !== user.email) {
        console.log("+++++++++++++++++++++++");
        recipients.push(adminData.serviceEmail);
      }
      console.log(recipients);
      const mailOptions = {
        from: `"${adminBrandName} Precious Metals" <${process.env.EMAIL_USER}>`,
        to: recipients.join(", "), // Send to both user and admin service email
        subject: config.subject,
        html: emailHTML,
        priority: "high",
        headers: {
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          Importance: "high",
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(
        `✅ ${statusType} email sent successfully to ${
          recipients.length
        } recipients (Attempt ${retryAttempt + 1}):`,
        info.messageId,
        `Recipients: ${recipients.join(", ")}`
      );

      return {
        success: true,
        message: `${statusType} email sent successfully to ${recipients.length} recipients`,
        messageId: info.messageId,
        statusType: statusType,
        recipients: recipients,
        retryAttempt,
      };
    } catch (error) {
      console.error(
        `❌ Error sending ${statusType} email (Attempt ${retryAttempt + 1}):`,
        error
      );

      if (retryAttempt < this.maxRetries - 1) {
        console.log(
          `🔄 Retrying email for ${statusType} (Attempt ${retryAttempt + 2})...`
        );
        const delay = this.retryDelay * Math.pow(2, retryAttempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendOrderStatusEmail(
          orderData,
          userData,
          adminData,
          statusType,
          additionalData,
          retryAttempt + 1
        );
      }

      return {
        success: false,
        message: `Failed to send ${statusType} email after ${this.maxRetries} attempts`,
        error: error.message,
        statusType: statusType,
        retryAttempt,
      };
    }
  }

  // Alternative method to send separate emails to user and admin
  async sendOrderStatusEmailsSeparately(
    orderData,
    userData,
    adminData,
    statusType,
    additionalData = {},
    retryAttempt = 0
  ) {
    const results = {
      user: { success: false },
      admin: { success: false },
    };

    try {
      // Send to user
      const userResult = await this.sendOrderStatusEmail(
        orderData,
        userData,
        { ...adminData, serviceEmail: null }, // Remove service email to send only to user
        statusType,
        additionalData,
        retryAttempt
      );
      results.user = userResult;

      // Send to admin service email if provided
      if (adminData?.serviceEmail) {
        // Create admin user data structure
        const adminUserData = {
          users: [
            {
              email: adminData.serviceEmail,
              name: adminData.companyName || "Admin",
            },
          ],
        };

        const adminResult = await this.sendOrderStatusEmail(
          orderData,
          adminUserData,
          { ...adminData, serviceEmail: null }, // Remove service email to prevent recursion
          statusType,
          {
            ...additionalData,
            isAdminCopy: true, // Flag to identify this as admin copy
            customerName: userData.users[0].name,
            customerEmail: userData.users[0].email,
          },
          retryAttempt
        );
        results.admin = adminResult;
      }

      const overallSuccess = results.user.success || results.admin.success;

      return {
        success: overallSuccess,
        message: `Email sent - User: ${
          results.user.success ? "✅" : "❌"
        }, Admin: ${results.admin.success ? "✅" : "❌"}`,
        results,
        statusType,
      };
    } catch (error) {
      console.error(
        `❌ Error in separate email sending for ${statusType}:`,
        error
      );
      return {
        success: false,
        message: `Failed to send ${statusType} emails`,
        error: error.message,
        results,
        statusType,
      };
    }
  }
}

// Enhanced Dynamic Notification Manager
class DynamicNotificationManager {
  static getNotificationConfig(statusType, orderData, additionalData = {}) {
    const configs = {
      order_placed: {
        userTitle: "🎉 Order Placed Successfully!",
        userBody: `Your order #${
          orderData.transactionId
        } has been placed successfully for ${orderData.totalPrice.toFixed(
          2
        )}. We'll process it soon!`,
        adminTitle: "🎉 New Order Placed",
        adminBody: `New order #${
          orderData.transactionId
        } has been placed for ${orderData.totalPrice.toFixed(2)}.`,
        type: "order_placed",
      },
      approved: {
        userTitle: "✅ Item Approved!",
        userBody: additionalData?.itemDetails
          ? `Great news! Your item "${additionalData.itemDetails.productName}" in order #${orderData.transactionId} has been approved and is being processed.`
          : `Your item in order #${orderData.transactionId} has been approved and is being processed.`,
        adminTitle: "✅ Item Approved by User",
        adminBody: additionalData?.itemDetails
          ? `User approved item "${additionalData.itemDetails.productName}" in order #${orderData.transactionId}.`
          : `User approved an item in order #${orderData.transactionId}.`,
        type: "approved",
      },
      item_approved: {
        userTitle: "✅ Item Approved!",
        userBody: additionalData?.itemDetails
          ? `Great news! Your item "${additionalData.itemDetails.productName}" in order #${orderData.transactionId} has been approved and is being processed.`
          : `Your item in order #${orderData.transactionId} has been approved and is being processed.`,
        adminTitle: "✅ Item Approved by User",
        adminBody: additionalData?.itemDetails
          ? `User approved item "${additionalData.itemDetails.productName}" in order #${orderData.transactionId}.`
          : `User approved an item in order #${orderData.transactionId}.`,
        type: "item_approved",
      },
      item_rejected: {
        userTitle: "⚠️ Item Rejected",
        userBody: additionalData?.itemDetails
          ? `Your item "${additionalData.itemDetails.productName}" in order #${orderData.transactionId} has been rejected. Please check your email for details.`
          : `An item in order #${orderData.transactionId} has been rejected. Please check your email for details.`,
        adminTitle: "⚠️ Item Rejected by User",
        adminBody: additionalData?.itemDetails
          ? `User rejected item "${additionalData.itemDetails.productName}" in order #${orderData.transactionId}.`
          : `User rejected an item in order #${orderData.transactionId}.`,
        type: "item_rejected",
      },
      item_reject: {
        userTitle: "⚠️ Item Rejected",
        userBody: additionalData?.itemDetails
          ? `Your item "${additionalData.itemDetails.productName}" in order #${orderData.transactionId} has been rejected. Please check your email for details.`
          : `An item in order #${orderData.transactionId} has been rejected. Please check your email for details.`,
        adminTitle: "⚠️ Item Rejected by User",
        adminBody: additionalData?.itemDetails
          ? `User rejected item "${additionalData.itemDetails.productName}" in order #${orderData.transactionId}.`
          : `User rejected an item in order #${orderData.transactionId}.`,
        type: "item_reject",
      },
      approvel: {
        userTitle: "✅ Order Approved!",
        userBody: `Great news! Your order #${orderData.transactionId} has been approved and will be processed soon.`,
        adminTitle: "✅ Order Approved",
        adminBody: `Order #${orderData.transactionId} has been approved for processing.`,
        type: "approvel",
      },
      user_approvel_pending: {
        userTitle: "⏳ User Approval Needed!",
        userBody: `Your order #${orderData.transactionId} requires your confirmation. Please review and confirm.`,
        adminTitle: "⏳ User Approval Pending",
        adminBody: `Order #${orderData.transactionId} is awaiting user confirmation.`,
        type: "user_approvel_pending",
      },
      pending: {
        userTitle: "🔄 Order Under Review",
        userBody: `Your order #${orderData.transactionId} is being reviewed by our team. We'll update you soon.`,
        adminTitle: "🔄 Order Under Review",
        adminBody: `Order #${orderData.transactionId} is pending review.`,
        type: "pending",
      },
      processing: {
        userTitle: "🔧 Order Processing Started",
        userBody: `Your order #${
          orderData.transactionId
        } is now being processed. ${
          additionalData.estimatedCompletion || "Updates will follow"
        }`,
        adminTitle: "🔧 Order Processing",
        adminBody: `Order #${orderData.transactionId} processing has begun.`,
        type: "processing",
      },
      scusess: {
        userTitle: "✅ Order Successful!",
        userBody: `Your order #${orderData.transactionId} has been successfully completed! Please confirm receipt.`,
        adminTitle: "✅ Order Successful",
        adminBody: `Order #${orderData.transactionId} has been successfully completed.`,
        type: "scusess",
      },
      reject: {
        userTitle: "⚠️ Order Rejected",
        userBody: `Your order #${orderData.transactionId} has been rejected. Please check your email for details.`,
        adminTitle: "⚠️ Order Rejected",
        adminBody: `Order #${orderData.transactionId} has been rejected.`,
        type: "reject",
      },
    };

    return configs[statusType.toLowerCase()];
  }

  static async removeInvalidFCMToken(model, createdBy, token) {
    try {
      await model.updateOne(
        { createdBy, "FCMTokens.token": token },
        { $pull: { FCMTokens: { token } } }
      );
      console.log(
        `Removed invalid FCM token: ${token.substring(
          0,
          20
        )}... for createdBy: ${createdBy}`
      );
    } catch (error) {
      console.error(
        `Error removing invalid FCM token for createdBy: ${createdBy}:`,
        error.message
      );
    }
  }

  static async sendOrderStatusNotifications(
    orderData,
    userData,
    adminData,
    statusType,
    additionalData = {}
  ) {
    const notifications = [];

    try {
      const user = userData.users[0];
      const userName =
        user.name || `Customer ${orderData.userId.toString().slice(-5)}`;
      const config = this.getNotificationConfig(
        statusType,
        orderData,
        additionalData
      );

      if (!config) {
        throw new Error(
          `Notification configuration not found for status: ${statusType}`
        );
      }

      const adminLogo = /^https?:\/\/[^\s$.?#].[^\s]*$/.test(adminData.logo)
        ? adminData.logo
        : "https://aurifyimage.s3.ap-south-1.amazonaws.com/1744013531086-swiss.webp";
      console.log(`Using adminLogo: ${adminLogo}`);

      const notificationData = {
        type: config.type,
        orderId: orderData._id.toString(),
        transactionId: orderData.transactionId,
        statusType: statusType,
        totalAmount: orderData.totalPrice.toString(),
        adminLogo,
        redirectUrl: "https://aurify.ae/orders",
        skipInAppNotifications: "true",
        ...additionalData,
      };

      // Fetch and validate user FCM tokens
      const userFCMDoc = await UserFCMTokenModel.findOne({
        createdBy: orderData.userId,
      });
      const userFCMTokens = userFCMDoc?.FCMTokens || [];
      console.log(`📱 Found ${userFCMTokens.length} user FCM tokens`);

      const { validTokens: validUserTokens, invalidTokens: invalidUserTokens } =
        await EnhancedNotificationService.validateAndRemoveInvalidTokens(
          userFCMTokens
        );

      console.log(
        `✅ Valid user tokens: ${validUserTokens.length}, Invalid: ${invalidUserTokens.length}`
      );

      for (const invalidToken of invalidUserTokens) {
        await this.removeInvalidFCMToken(
          UserFCMTokenModel,
          orderData.userId,
          typeof invalidToken === "string" ? invalidToken : invalidToken.token
        );
      }

      // Send user notifications
      if (validUserTokens.length > 0) {
        const userNotificationResults =
          await EnhancedNotificationService.sendMultiPlatformNotification(
            validUserTokens,
            config.userTitle,
            config.userBody,
            {
              ...notificationData,
              customerName: userName,
            }
          );

        for (const result of userNotificationResults) {
          notifications.push({
            type: `user_push_${result.platform || "app"}`,
            token: result.token,
            success: result.success,
            result: result.result,
            error: result.error,
          });

          if (
            !result.success &&
            [
              "NotRegistered",
              "InvalidRegistration",
              "MismatchSenderId",
            ].includes(result.code)
          ) {
            await this.removeInvalidFCMToken(
              UserFCMTokenModel,
              orderData.userId,
              result.token
            );
          }
        }
      } else {
        console.warn("⚠️ No valid user FCM tokens found");
        notifications.push({
          type: "user_push",
          success: false,
          error: "No valid FCM tokens found for user",
        });
      }

      // Fetch and validate admin FCM tokens
      const adminFCMDoc = await FCMTokenModel.findOne({
        createdBy: orderData.adminId,
      });
      const adminFCMTokens = adminFCMDoc?.FCMTokens || [];
      console.log(`📱 Found ${adminFCMTokens.length} admin FCM tokens`);

      const {
        validTokens: validAdminTokens,
        invalidTokens: invalidAdminTokens,
      } = await EnhancedNotificationService.validateAndRemoveInvalidTokens(
        adminFCMTokens
      );

      console.log(
        `✅ Valid admin tokens: ${validAdminTokens.length}, Invalid: ${invalidAdminTokens.length}`
      );

      for (const invalidToken of invalidAdminTokens) {
        await this.removeInvalidFCMToken(
          FCMTokenModel,
          orderData.adminId,
          typeof invalidToken === "string" ? invalidToken : invalidToken.token
        );
      }

      // Send admin notifications
      if (validAdminTokens.length > 0) {
        const adminNotificationResults =
          await EnhancedNotificationService.sendMultiPlatformNotification(
            validAdminTokens,
            config.adminTitle,
            config.adminBody,
            {
              ...notificationData,
              type: config.type + "_admin",
              customerName: userName,
            }
          );

        for (const result of adminNotificationResults) {
          notifications.push({
            type: `admin_push_${result.platform || "app"}`,
            token: result.token,
            success: result.success,
            result: result.result,
            error: result.error,
          });

          if (
            !result.success &&
            [
              "NotRegistered",
              "InvalidRegistration",
              "MismatchSenderId",
            ].includes(result.code)
          ) {
            await this.removeInvalidFCMToken(
              FCMTokenModel,
              orderData.adminId,
              result.token
            );
          }
        }
      } else {
        console.warn("⚠️ No valid admin FCM tokens found");
        notifications.push({
          type: "admin_push",
          success: false,
          error: "No valid FCM tokens found for admin",
        });
      }

      // Handle user approval pending reminder
      if (
        statusType.toLowerCase() === "user_approvel_pending" &&
        orderData.items &&
        orderData.items.length > 0 &&
        validUserTokens.length > 0
      ) {
        const item = orderData.items[0];
        const reminderResults =
          await EnhancedNotificationService.sendMultiPlatformNotification(
            validUserTokens,
            undefined,
            undefined,
            {
              ...notificationData,
              type: "order_reminder",
              productId: item.productId.toString(),
              quantity: item.quantity.toString(),
              isWarning: additionalData.isWarning?.toString() || "false",
              isAutoReject: additionalData.isAutoReject?.toString() || "false",
              adminLogo,
            },
            EnhancedNotificationService.sendOrderReminderNotification
          );

        for (const result of reminderResults) {
          notifications.push({
            type: `user_reminder_${result.platform || "app"}`,
            token: result.token,
            success: result.success,
            result: result.result,
            error: result.error,
          });

          if (
            !result.success &&
            [
              "NotRegistered",
              "InvalidRegistration",
              "MismatchSenderId",
            ].includes(result.code)
          ) {
            await this.removeInvalidFCMToken(
              UserFCMTokenModel,
              orderData.userId,
              result.token
            );
          }
        }
      }

      // Create in-app notifications
      if (!additionalData.skipInAppNotifications) {
        await this.createInAppNotifications(
          orderData,
          userData,
          adminData,
          config,
          userName
        );
        notifications.push({ type: "in_app", success: true });
      } else {
        notifications.push({
          type: "in_app",
          success: true,
          message: "Skipped in-app notifications",
        });
      }

      const successfulNotifications = notifications.filter(
        (n) => n.success
      ).length;
      const totalNotifications = notifications.length;

      console.log(
        `📊 Notification Summary: ${successfulNotifications}/${totalNotifications} successful`
      );

      return {
        success: successfulNotifications > 0,
        message: `Notifications processed: ${successfulNotifications}/${totalNotifications} successful`,
        statusType,
        notifications,
        summary: {
          total: totalNotifications,
          successful: successfulNotifications,
          failed: totalNotifications - successfulNotifications,
        },
      };
    } catch (error) {
      console.error("❌ Error in notification manager:", error);
      return {
        success: false,
        message: "Failed to process notifications",
        error: error.message,
        statusType,
        notifications,
      };
    }
  }

  static async createInAppNotifications(
    orderData,
    userData,
    adminData,
    config,
    userName
  ) {
    try {
      const userNotificationMessage = config.userBody;
      let userNotificationDoc = await userNotification.findOne({
        createdBy: orderData.userId,
      });

      if (userNotificationDoc) {
        userNotificationDoc.notification.push({
          message: userNotificationMessage,
          read: false,
          createdAt: new Date(),
          type: config.type,
        });
        await userNotificationDoc.save();
      } else {
        userNotificationDoc = new userNotification({
          notification: [
            {
              message: userNotificationMessage,
              read: false,
              createdAt: new Date(),
              type: config.type,
            },
          ],
          createdBy: orderData.userId,
        });
        await userNotificationDoc.save();
      }

      const adminNotificationMessage = config.adminBody;
      let adminNotificationDoc = await Notification.findOne({
        createdBy: orderData.adminId,
      });

      if (adminNotificationDoc) {
        adminNotificationDoc.notification.push({
          message: adminNotificationMessage,
          read: false,
          createdAt: new Date(),
          type: config.type + "_admin",
        });
        await adminNotificationDoc.save();
      } else {
        adminNotificationDoc = new Notification({
          notification: [
            {
              message: adminNotificationMessage,
              read: false,
              createdAt: new Date(),
              type: config.type + "_admin",
            },
          ],
          createdBy: orderData.adminId,
        });
        await adminNotificationDoc.save();
      }

      console.log(`✅ In-app notifications created for ${config.type}`);
    } catch (error) {
      console.error("❌ Error creating in-app notifications:", error.message);
      throw error;
    }
  }
}

// Enhanced Main Order Status Service
class OrderStatusService {
  constructor() {
    this.emailService = new DynamicEmailService();
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  async sendOrderStatusUpdates(
    orderData,
    userData,
    adminData,
    statusType,
    additionalData = {}
  ) {
    const results = {
      statusType,
      email: { success: false },
      notifications: { success: false },
      timestamp: new Date().toISOString(),
      processId: `${statusType}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      retryAttempt: additionalData.isRetry
        ? additionalData.retryAttempt || 1
        : 0,
    };

    try {
      console.log(
        `📧 [${results.processId}] Starting ${statusType} email and notifications...`
      );

      // Choose email sending method based on configuration
      const emailPromise = additionalData.sendSeparateEmails
        ? this.emailService.sendOrderStatusEmailsSeparately(
            orderData,
            userData,
            adminData,
            statusType,
            additionalData
          )
        : this.emailService.sendOrderStatusEmail(
            orderData,
            userData,
            adminData,
            statusType,
            additionalData
          );

      // Send email (non-blocking)
      const emailResultPromise = emailPromise.catch((error) => {
        console.error(`❌ [${results.processId}] Email failed:`, error.message);
        return {
          success: false,
          message: `Failed to send ${statusType} email`,
          error: error.message,
          statusType,
        };
      });

      // Send notifications (non-blocking)
      const notificationPromise =
        DynamicNotificationManager.sendOrderStatusNotifications(
          orderData,
          userData,
          adminData,
          statusType,
          additionalData
        ).catch((error) => {
          console.error(
            `❌ [${results.processId}] Notifications failed:`,
            error.message
          );
          return {
            success: false,
            message: `Failed to send ${statusType} notifications`,
            error: error.message,
            statusType,
            notifications: [],
          };
        });

      const [emailResult, notificationResult] = await Promise.allSettled([
        emailResultPromise,
        notificationPromise,
      ]);

      results.email =
        emailResult.status === "fulfilled"
          ? emailResult.value
          : {
              success: false,
              error: emailResult.reason?.message || "Email promise rejected",
              statusType,
            };

      results.notifications =
        notificationResult.status === "fulfilled"
          ? notificationResult.value
          : {
              success: false,
              error:
                notificationResult.reason?.message ||
                "Notification promise rejected",
              statusType,
              notifications: [],
            };

      // Retry failed notifications if necessary
      if (
        !results.notifications.success &&
        results.retryAttempt < this.maxRetries
      ) {
        console.log(
          `🔄 [${results.processId}] Scheduling notification retry ${
            results.retryAttempt + 1
          }/${this.maxRetries}...`
        );
        const delay = this.retryDelay * Math.pow(2, results.retryAttempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        const retryResult = await this.retryFailedNotifications(
          orderData,
          userData,
          adminData,
          statusType,
          results
        );
        results.notifications = retryResult.results.notifications;
        results.retryAttempt = retryResult.retryAttempt;
      }

      const overallSuccess =
        results.email.success || results.notifications.success;

      console.log(
        `${overallSuccess ? "✅" : "❌"} [${
          results.processId
        }] ${statusType} updates processed - Email: ${
          results.email.success ? "✅" : "❌"
        }, Notifications: ${results.notifications.success ? "✅" : "❌"}`
      );

      return {
        success: overallSuccess,
        message: `${statusType} updates processed`,
        results,
        processId: results.processId,
      };
    } catch (error) {
      console.error(
        `❌ [${results.processId}] Error in ${statusType} service:`,
        error
      );
      return {
        success: false,
        message: `Failed to process ${statusType} updates`,
        error: error.message,
        results,
        processId: results.processId,
      };
    }
  }

  async retryFailedNotifications(
    orderData,
    userData,
    adminData,
    statusType,
    previousResults
  ) {
    try {
      console.log(`🔄 Retrying failed notifications for ${statusType}...`);

      const failedNotifications =
        previousResults.notifications?.notifications?.filter(
          (n) => !n.success
        ) || [];

      if (failedNotifications.length === 0) {
        return {
          success: true,
          message: "No failed notifications to retry",
          results: previousResults,
        };
      }

      console.log(
        `🔄 Found ${failedNotifications.length} failed notifications to retry`
      );

      const retryResult = await this.sendOrderStatusUpdates(
        orderData,
        userData,
        adminData,
        statusType,
        {
          ...previousResults.additionalData,
          isRetry: true,
          retryAttempt: (previousResults.retryAttempt || 0) + 1,
        }
      );

      return {
        success: retryResult.success,
        message: `Retry attempt completed for ${statusType}`,
        results: retryResult.results,
        originalFailures: failedNotifications.length,
        retryAttempt: (previousResults.retryAttempt || 0) + 1,
      };
    } catch (error) {
      console.error(`❌ Retry failed for ${statusType}:`, error);
      return {
        success: false,
        error: error.message,
        message: `Retry failed for ${statusType}`,
        results: previousResults,
      };
    }
  }

  async orderPlaced(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "order_placed",
      { ...additionalData, sendSeparateEmails: true } // Force separate emails for order_placed
    );
  }

  async approvel(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "approvel",
      additionalData
    );
  }

  async userApprovelPending(
    orderData,
    userData,
    adminData,
    additionalData = {}
  ) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "user_approvel_pending",
      additionalData
    );
  }

  async pending(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "pending",
      additionalData
    );
  }

  async processing(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "processing",
      additionalData
    );
  }

  async scusess(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "scusess",
      additionalData
    );
  }

  async reject(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "reject",
      additionalData
    );
  }

  /**
   * Send item approved notifications and emails
   * @param {Object} orderData - Order data
   * @param {Object} userData - User data
   * @param {Object} adminData - Admin data
   * @param {Object} additionalData - Additional data including item details
   * @returns {Promise} Result of status update
   */
  async approved(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "approved",
      additionalData
    );
  }

  /**
   * Send item approved notifications and emails (alias)
   * @param {Object} orderData - Order data
   * @param {Object} userData - User data
   * @param {Object} adminData - Admin data
   * @param {Object} additionalData - Additional data including item details
   * @returns {Promise} Result of status update
   */
  async itemApproved(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "item_approved",
      additionalData
    );
  }

  /**
   * Send item rejected notifications and emails
   * @param {Object} orderData - Order data
   * @param {Object} userData - User data
   * @param {Object} adminData - Admin data
   * @param {Object} additionalData - Additional data including item details and rejection reason
   * @returns {Promise} Result of status update
   */
  async itemRejected(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "item_rejected",
      additionalData
    );
  }

  async itemReject(orderData, userData, adminData, additionalData = {}) {
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "item_reject",
      additionalData
    );
  }

  static formatItemDetails(item) {
    return {
      productId: item.productId || item._id,
      productName: item.productName || item.title || "Unknown Product",
      quantity: item.quantity || 1,
      price: item.fixedPrice || item.price || 0,
      totalPrice: item.totalPrice || item.quantity * item.fixedPrice || 0,
      weight: item.productWeight || item.weight || 0,
      specifications: item.specifications || null,
      customizations: item.customizations || null,
    };
  }

  async sendBulkItemStatusUpdates(itemUpdates, orderData, userData, adminData) {
    const results = [];

    for (const update of itemUpdates) {
      try {
        const { itemId, statusType, additionalData = {} } = update;

        // Find the specific item in the order
        const item = orderData.items?.find(
          (i) =>
            i._id?.toString() === itemId || i.productId?.toString() === itemId
        );

        if (!item) {
          results.push({
            itemId,
            statusType,
            success: false,
            error: "Item not found in order",
          });
          continue;
        }

        const formattedItem = OrderStatusService.formatItemDetails(item);
        const itemAdditionalData = {
          ...additionalData,
          itemDetails: formattedItem,
          isItemSpecific: true,
        };

        let result;
        switch (statusType.toLowerCase()) {
          case "approved":
          case "item_approved":
            result = await this.itemApproved(
              orderData,
              userData,
              adminData,
              itemAdditionalData
            );
            break;
          case "rejected":
          case "item_rejected":
          case "item_reject":
            result = await this.itemRejected(
              orderData,
              userData,
              adminData,
              itemAdditionalData
            );
            break;
          default:
            result = {
              success: false,
              error: `Unsupported item status type: ${statusType}`,
            };
        }

        results.push({
          itemId,
          statusType,
          ...result,
        });
      } catch (error) {
        results.push({
          itemId: update.itemId,
          statusType: update.statusType,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: results.some((r) => r.success),
      message: `Processed ${results.length} item status updates`,
      results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    };
  }

  async sendItemStatusUpdate(
    itemId,
    statusType,
    orderData,
    userData,
    adminData,
    additionalData = {}
  ) {
    try {
      // Find the specific item in the order
      const item = orderData.items?.find(
        (i) =>
          i._id?.toString() === itemId || i.productId?.toString() === itemId
      );

      if (!item) {
        throw new Error(
          `Item with ID ${itemId} not found in order ${orderData.transactionId}`
        );
      }

      const formattedItem = OrderStatusService.formatItemDetails(item);
      const itemAdditionalData = {
        ...additionalData,
        itemDetails: formattedItem,
        isItemSpecific: true,
      };

      switch (statusType.toLowerCase()) {
        case "approved":
        case "item_approved":
          return await this.itemApproved(
            orderData,
            userData,
            adminData,
            itemAdditionalData
          );

        case "rejected":
        case "item_rejected":
        case "item_reject":
          return await this.itemRejected(
            orderData,
            userData,
            adminData,
            itemAdditionalData
          );

        default:
          throw new Error(`Unsupported item status type: ${statusType}`);
      }
    } catch (error) {
      console.error(`❌ Error sending item status update:`, error);
      return {
        success: false,
        message: `Failed to send item ${statusType} update`,
        error: error.message,
        itemId,
        statusType,
      };
    }
  }

  static getAvailableItemStatusTypes() {
    return [
      "approved",
      "item_approved",
      "rejected",
      "item_rejected",
      "item_reject",
    ];
  }

  static isValidItemStatusType(statusType) {
    return this.getAvailableItemStatusTypes().includes(
      statusType.toLowerCase()
    );
  }

  static getAvailableStatusMethods() {
    return {
      order_level: {
        orderPlaced: "Send order placed notifications",
        approvel: "Send order approval notifications",
        userApprovelPending: "Send user approval pending notifications",
        pending: "Send order pending review notifications",
        processing: "Send order processing notifications",
        scusess: "Send order success notifications",
        reject: "Send order rejection notifications",
      },
      item_level: {
        approved: "Send item approved notifications",
        itemApproved: "Send item approved notifications (alias)",
        itemRejected: "Send item rejected notifications",
        itemReject: "Send item rejected notifications (alias)",
      },
      utility: {
        sendItemStatusUpdate: "Send status update for specific item",
        sendBulkItemStatusUpdates: "Send status updates for multiple items",
        formatItemDetails: "Format item details for notifications",
        isValidItemStatusType: "Validate item status type",
        getAvailableItemStatusTypes: "Get available item status types",
      },
    };
  }
}

export default OrderStatusService;