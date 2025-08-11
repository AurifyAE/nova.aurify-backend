import EnhancedDynamicNotificationManager from "./EnhancedDynamicNotificationManager.js";
import DynamicEmailService from "./DynamicEmailService.js"; // Assuming your email service is extracted

// Enhanced Order Status Service
class EnhancedOrderStatusService {
  constructor() {
    this.emailService = new DynamicEmailService();
  }

  async sendOrderStatusUpdates(
    orderData,
    userData,
    adminData,
    statusType,
    additionalData = {}
  ) {
    const results = {
      statusType: statusType,
      email: { success: false },
      notifications: { success: false },
      timestamp: new Date().toISOString(),
      summary: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
      },
    };

    console.log(`🚀 Starting ${statusType} updates for order #${orderData.transactionId}`);

    try {
      let emailSuccess = false;
      let notificationSuccess = false;

      // Send email notification
      try {
        console.log(`📧 Sending ${statusType} email...`);
        const emailResult = await this.emailService.sendOrderStatusEmail(
          orderData,
          userData,
          adminData,
          statusType,
          additionalData
        );
        results.email = emailResult;
        emailSuccess = emailResult.success;
        
        if (emailSuccess) {
          console.log(`✅ ${statusType} email sent successfully`);
          results.summary.successfulOperations++;
        } else {
          console.warn(`⚠️ ${statusType} email failed:`, emailResult.message);
          results.summary.failedOperations++;
        }
        results.summary.totalOperations++;
      } catch (emailError) {
        console.error(`❌ Email service error:`, emailError.message);
        results.email = {
          success: false,
          message: "Email service failed",
          error: emailError.message,
        };
        results.summary.failedOperations++;
        results.summary.totalOperations++;
      }

      // Send push notifications
      try {
        console.log(`📱 Sending ${statusType} push notifications...`);
        const notificationResult = await EnhancedDynamicNotificationManager.sendOrderStatusNotifications(
          orderData,
          userData,
          adminData,
          statusType,
          additionalData
        );
        results.notifications = notificationResult;
        notificationSuccess = notificationResult.success;
        
        if (notificationSuccess) {
          console.log(`✅ ${statusType} notifications processed successfully`);
          console.log(`📊 Notification summary:`, notificationResult.summary);
          results.summary.successfulOperations++;
        } else {
          console.warn(`⚠️ ${statusType} notifications failed:`, notificationResult.message);
          results.summary.failedOperations++;
        }
        results.summary.totalOperations++;
      } catch (notificationError) {
        console.error(`❌ Notification service error:`, notificationError.message);
        results.notifications = {
          success: false,
          message: "Notification service failed",
          error: notificationError.message,
        };
        results.summary.failedOperations++;
        results.summary.totalOperations++;
      }

      // Determine overall success
      const overallSuccess = emailSuccess || notificationSuccess;
      
      // Log comprehensive results
      console.log(`${overallSuccess ? "✅" : "❌"} ${statusType} updates completed`);
      console.log(`📊 Summary: ${results.summary.successfulOperations}/${results.summary.totalOperations} operations successful`);
      
      if (results.notifications.notifications) {
        const notifSummary = results.notifications.summary;
        console.log(`📱 Push notifications: ${notifSummary.successful}/${notifSummary.total} sent successfully`);
      }

      return {
        success: overallSuccess,
        message: `${statusType} updates processed: ${results.summary.successfulOperations}/${results.summary.totalOperations} successful`,
        results: results,
        statusType: statusType,
      };

    } catch (error) {
      console.error(`❌ Critical error in ${statusType} service:`, error);
      return {
        success: false,
        message: `Critical failure in ${statusType} updates`,
        error: error.message,
        results: results,
        statusType: statusType,
      };
    }
  }

  // Enhanced helper methods with better error handling and logging
  async orderPlaced(orderData, userData, adminData, additionalData = {}) {
    console.log(`🎉 Processing order placed notification for order #${orderData.transactionId}`);
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "order_placed",
      {
        ...additionalData,
        orderNote: additionalData.orderNote || "Thank you for your order!",
      }
    );
  }

  async approvel(orderData, userData, adminData, additionalData = {}) {
    console.log(`✅ Processing order approval notification for order #${orderData.transactionId}`);
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "approvel",
      {
        ...additionalData,
        approvalNote: additionalData.approvalNote || "Your order has been approved for processing",
      }
    );
  }

  async userApprovelPending(orderData, userData, adminData, additionalData = {}) {
    console.log(`⏳ Processing user approval pending notification for order #${orderData.transactionId}`);
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "user_approvel_pending",
      {
        ...additionalData,
        pendingReason: additionalData.pendingReason || "Order requires user confirmation",
        isWarning: additionalData.isWarning || false,
        isAutoReject: additionalData.isAutoReject || false,
      }
    );
  }

  async pending(orderData, userData, adminData, additionalData = {}) {
    console.log(`🔄 Processing pending notification for order #${orderData.transactionId}`);
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "pending",
      {
        ...additionalData,
        estimatedReviewTime: additionalData.estimatedReviewTime || "24-48 hours",
      }
    );
  }

  async processing(orderData, userData, adminData, additionalData = {}) {
    console.log(`🔧 Processing order processing notification for order #${orderData.transactionId}`);
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "processing",
      {
        ...additionalData,
        estimatedCompletion: additionalData.estimatedCompletion || "Processing will be completed soon",
      }
    );
  }

  async scusess(orderData, userData, adminData, additionalData = {}) {
    console.log(`🎉 Processing success notification for order #${orderData.transactionId}`);
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "scusess",
      {
        ...additionalData,
        deliveryDate: additionalData.deliveryDate || new Date().toLocaleDateString("en-AE"),
      }
    );
  }

  async reject(orderData, userData, adminData, additionalData = {}) {
    console.log(`⚠️ Processing rejection notification for order #${orderData.transactionId}`);
    return this.sendOrderStatusUpdates(
      orderData,
      userData,
      adminData,
      "reject",
      {
        ...additionalData,
        rejectionReason: additionalData.rejectionReason || "Please contact support for more information",
      }
    );
  }

  // New methods for specific notification scenarios
  async sendCustomNotification(orderData, userData, adminData, title, body, additionalData = {}) {
    console.log(`📢 Sending custom notification for order #${orderData.transactionId}`);
    
    try {
      const result = await EnhancedDynamicNotificationManager.sendOrderStatusNotifications(
        orderData,
        userData,
        adminData,
        "custom",
        {
          ...additionalData,
          customTitle: title,
          customBody: body,
        }
      );

      return {
        success: result.success,
        message: "Custom notification sent",
        result: result,
      };
    } catch (error) {
      console.error(`❌ Error sending custom notification:`, error);
      return {
        success: false,
        message: "Failed to send custom notification",
        error: error.message,
      };
    }
  }

  async sendBulkOrderNotifications(orders, title, body, additionalData = {}) {
    console.log(`📢 Sending bulk notifications to ${orders.length} orders`);
    
    const results = [];
    
    for (const orderData of orders) {
      try {
        const result = await this.sendCustomNotification(
          orderData.order,
          orderData.userData,
          orderData.adminData,
          title,
          body,
          additionalData
        );
        
        results.push({
          orderId: orderData.order._id,
          transactionId: orderData.order.transactionId,
          success: result.success,
          result: result,
        });
      } catch (error) {
        results.push({
          orderId: orderData.order._id,
          transactionId: orderData.order.transactionId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount > 0,
      message: `Bulk notifications: ${successCount}/${orders.length} successful`,
      results: results,
      summary: {
        total: orders.length,
        successful: successCount,
        failed: orders.length - successCount,
      },
    };
  }

  // Method to send notification to specific platforms only
  async sendPlatformSpecificNotification(orderData, userData, adminData, statusType, platforms = ["web"], additionalData = {}) {
    console.log(`📱 Sending ${statusType} notification to platforms: ${platforms.join(", ")}`);
    
    try {
      // Get user FCM tokens
      const UserFCMTokenModel = (await import("../model/userFCMToken.js")).default;
      const userFCMDoc = await UserFCMTokenModel.findOne({ createdBy: orderData.userId });
      const userTokens = userFCMDoc?.FCMTokens || [];
      
      // Filter tokens by platform
      const filteredTokens = userTokens.filter(tokenData => {
        const platform = tokenData.platform || "app";
        return platforms.includes(platform);
      });

      if (filteredTokens.length === 0) {
        return {
          success: false,
          message: `No FCM tokens found for platforms: ${platforms.join(", ")}`,
        };
      }

      const config = EnhancedDynamicNotificationManager.getNotificationConfig(statusType, orderData, additionalData);
      const adminLogo = await EnhancedDynamicNotificationManager.fetchAdminLogo(orderData.adminId);

      const results = await EnhancedDynamicNotificationManager.sendNotificationToPlatforms(
        filteredTokens,
        config.userTitle,
        config.userBody,
        {
          type: config.type,
          orderId: orderData._id.toString(),
          transactionId: orderData.transactionId,
          adminLogo: adminLogo,
          ...additionalData,
        },
        platforms
      );

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        message: `Platform-specific notifications: ${successCount}/${results.length} successful`,
        results: results,
        platforms: platforms,
      };

    } catch (error) {
      console.error(`❌ Error sending platform-specific notification:`, error);
      return {
        success: false,
        message: "Failed to send platform-specific notification",
        error: error.message,
      };
    }
  }

  // Web-only notification method
  async sendWebNotification(orderData, userData, adminData, statusType, additionalData = {}) {
    return this.sendPlatformSpecificNotification(
      orderData,
      userData,
      adminData,
      statusType,
      ["web"],
      additionalData
    );
  }

  // Mobile-only notification method
  async sendMobileNotification(orderData, userData, adminData, statusType, additionalData = {}) {
    return this.sendPlatformSpecificNotification(
      orderData,
      userData,
      adminData,
      statusType,
      ["android", "ios", "app"],
      additionalData
    );
  }
}

export default EnhancedOrderStatusService;