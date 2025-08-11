import admin from "./firebase.js";

class EnhancedNotificationService {
  static async sendNotification(deviceToken, title, body, data = {}) {
    // Validate inputs
    if (
      !deviceToken ||
      typeof deviceToken !== "string" ||
      deviceToken.trim() === ""
    ) {
      console.error("Invalid device token:", deviceToken);
      throw Object.assign(new Error("Invalid device token"), {
        code: "InvalidToken",
        details: { deviceToken, timestamp: new Date().toISOString() },
      });
    }

    title =
      (title && typeof title === "string" && title.trim()) || "Notification";
    body =
      (body && typeof body === "string" && body.trim()) ||
      "You have a new notification.";
    console.log(`Validated title: ${title}, body: ${body}`);

    // Validate admin logo
    const defaultLogo =
      "https://aurifyimage.s3.ap-south-1.amazonaws.com/1744013531086-swiss.webp";
    const adminLogo = /^https?:\/\/[^\s$.?#].[^\s]*$/.test(data.adminLogo)
      ? data.adminLogo
      : defaultLogo;

    console.log(`Using adminLogo: ${adminLogo}`);

    if (data.adminLogo && data.adminLogo !== adminLogo) {
      console.warn(
        `Invalid admin logo URL: ${data.adminLogo}. Using default: ${defaultLogo}`
      );
    }

    // Sanitize data - ensure all values are strings
    const sanitizedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        sanitizedData[key] = typeof value === "string" ? value : String(value);
      }
    }

    // Determine platform
    const platform =
      sanitizedData.platform ||
      this.detectPlatformFromToken(deviceToken) ||
      "android";
    const isWeb = platform === "web";
    const isAndroid = platform === "android";
    const isIOS = platform === "ios";

    console.log(`📱 Preparing notification for platform: ${platform}`);

    const skipInAppNotifications =
      sanitizedData.skipInAppNotifications === "true";

    // Base FCM message - IMPORTANT: Always include notification for background/closed state
    const message = {
      token: deviceToken.trim(),
      // Always include notification object for background/closed app notifications
      notification: {
        title,
        body,
      },
      data: {
        type: sanitizedData.type || "default_notification",
        orderId: sanitizedData.orderId || "",
        transactionId: sanitizedData.transactionId || "",
        statusType: sanitizedData.statusType || "",
        totalAmount: sanitizedData.totalAmount || "",
        customerName: sanitizedData.customerName || "",
        platform,
        timestamp: new Date().toISOString(),
        adminLogo,
        redirectUrl: sanitizedData.redirectUrl || "https://aurify.ae/orders",
        title,
        body,
        orderNote: sanitizedData.orderNote || "",
        skipInAppNotifications: sanitizedData.skipInAppNotifications || "false",
        ...sanitizedData,
      },
    };

    try {
      // Platform-specific configurations
      if (isWeb) {
        await this.configureWebNotification(
          message,
          { title, body },
          adminLogo,
          sanitizedData
        );
      } else {
        await this.configureMobileNotification(
          message,
          { title, body },
          adminLogo,
          sanitizedData,
          isAndroid,
          isIOS,
          skipInAppNotifications
        );
      }

      console.log(
        `🚀 Sending FCM message to ${deviceToken.substring(
          0,
          20
        )}... (platform: ${platform}):`
      );
      console.log("Message payload:", JSON.stringify(message, null, 2));

      const response = await admin.messaging().send(message);

      console.log(
        `✅ Notification sent successfully to ${deviceToken.substring(
          0,
          20
        )}... (${platform}): ${response}`
      );

      return {
        success: true,
        message: `Notification sent successfully to ${platform}`,
        response,
        deviceToken,
        platform,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleNotificationError(
        error,
        deviceToken,
        platform,
        sanitizedData,
        message
      );
    }
  }

  static detectPlatformFromToken(token) {
    if (!token || typeof token !== "string") return "android";

    // Web tokens are typically shorter (around 120-160 characters) and contain specific patterns
    if (token.length < 140 && !token.includes(":")) return "web";

    // Android tokens usually contain ":APA91b" pattern
    if (token.includes(":APA91b")) return "android";

    // iOS tokens are typically longer and don't contain colons
    if (token.length > 200 && !token.includes(":")) return "ios";

    // Default fallback based on length
    if (token.length <= 160) return "web";
    return "android";
  }

// Fixed configureWebNotification method
static async configureWebNotification(
  message,
  notificationPayload,
  adminLogo,
  data
) {
  console.log(
    `🌐 Configuring web notification with admin logo: ${adminLogo}`
  );

  // Create a unique tag based on order or timestamp
  const uniqueTag = `aurify_${
    data.orderId || data.transactionId || Date.now()
  }_${Math.random().toString(36).substr(2, 9)}`;

  // CRITICAL FIX: Proper web notification structure
  message.webpush = {
    headers: {
      Urgency: "high",
      TTL: "86400", // 24 hours
    },
    notification: {
      title: notificationPayload.title,
      body: notificationPayload.body,
      icon: adminLogo,
      badge: adminLogo,
      // Remove image property as it can cause issues
      // image: adminLogo, 
      requireInteraction: true,
      silent: false,
      tag: uniqueTag,
      renotify: true,
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      actions: [
        {
          action: "view_order",
          title: "View Order",
          icon: adminLogo,
        },
        {
          action: "dismiss", 
          title: "Dismiss",
        },
      ],
      // Move data inside notification data property
      data: {
        url: data.redirectUrl || "https://aurify.ae/orders",
        orderId: data.orderId || "",
        transactionId: data.transactionId || "",
        type: data.type || "default",
        adminLogo,
        timestamp: new Date().toISOString(),
        uniqueTag,
        platform: "web",
      },
    },
    // FCM options for web
    fcm_options: {
      link: data.redirectUrl || "https://aurify.ae/orders",
    },
  };

  // IMPORTANT: Keep the main data object for service worker
  message.data = {
    ...message.data,
    click_action: data.redirectUrl || "https://aurify.ae/orders",
    url: data.redirectUrl || "https://aurify.ae/orders", 
    // Add all data fields as strings (FCM requirement)
    adminLogo: adminLogo,
    admin_logo_url: adminLogo,
    uniqueTag: uniqueTag,
  };

  console.log(`🌐 Web notification configured with unique tag: ${uniqueTag}`);
  console.log(
    `🌐 Web notification webpush config:`,
    JSON.stringify(message.webpush, null, 2)
  );
}

  static async configureMobileNotification(
    message,
    notificationPayload,
    adminLogo,
    data,
    isAndroid,
    isIOS,
    skipInAppNotifications
  ) {
    // CRITICAL FIX: Don't remove notification object for background notifications
    // Only remove it if explicitly requested AND it's a data-only message
    if (skipInAppNotifications && data.dataOnly === "true") {
      delete message.notification; // Only remove for pure data messages
    }

    if (isAndroid) {
      console.log(
        `🤖 Configuring Android notification with image: ${adminLogo}`
      );

      message.android = {
        priority: "high",
        // IMPORTANT: Remove ttl: 0 or very short TTL for background notifications
        ttl: 3600000, // 1 hour in milliseconds (or 86400000 for 24 hours)
        data: {
          ...message.data,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          admin_logo_url: adminLogo,
          // Don't set background: "true" as it can interfere with notifications
        },
      };

      // Always configure Android notification for system display
      message.android.notification = {
        title: notificationPayload.title,
        body: notificationPayload.body,
        sound: "default",
        channelId: "aurify_channel",
        icon: "ic_notification",
        image: adminLogo,
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
        tag: data.orderId || "default_tag",
        color: "#D4AF37",
        // Add visibility for background notifications
        visibility: "public",
        priority: "high",
      };
    }

    if (isIOS) {
      console.log(
        `🍎 Configuring iOS notification with admin logo: ${adminLogo}`
      );

      const apsPayload = {
        sound: "default",
        badge: parseInt(data.badgeCount) || 1,
        category: "ORDER_NOTIFICATION",
        "thread-id": data.orderId || data.transactionId || "default_thread",
        "mutable-content": 1,
        "content-available": 1,
        // Always include alert for background notifications
        alert: {
          title: notificationPayload.title,
          body: notificationPayload.body,
        },
      };

      message.apns = {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert", // Always use alert, not background
          "apns-collapse-id": data.orderId || "aurify_notification",
        },
        payload: {
          aps: apsPayload,
          adminLogo,
          admin_logo_url: adminLogo,
          orderId: data.orderId || "",
          type: data.type || "default",
          redirectUrl: data.redirectUrl || "https://aurify.ae/orders",
          ...message.data,
        },
      };
    }
  }

  static handleNotificationError(error, deviceToken, platform, data, message) {
    const errorDetails = {
      code: error.code || "unknown",
      message: error.message || "Unknown error",
      deviceToken: deviceToken.substring(0, 20) + "...",
      platform,
      timestamp: new Date().toISOString(),
    };

    console.error(
      `❌ Error sending notification to ${deviceToken.substring(
        0,
        20
      )}... (${platform}):`
    );
    console.error("Error details:", JSON.stringify(errorDetails, null, 2));
    console.error("Full error:", error);

    const errorCode = error.code || "unknown";
    const errorMap = {
      "messaging/registration-token-not-registered": {
        code: "NotRegistered",
        message: "Device token not registered or expired",
      },
      "messaging/invalid-registration-token": {
        code: "InvalidRegistration",
        message: "Invalid registration token",
      },
      "messaging/mismatched-credential": {
        code: "MismatchSenderId",
        message: "Mismatched sender ID",
      },
      "messaging/too-many-requests": {
        code: "QuotaExceeded",
        message: "Rate limit exceeded",
      },
      "messaging/invalid-payload": {
        code: "InvalidPayload",
        message: "Invalid notification payload",
      },
      "messaging/invalid-argument": {
        code: "InvalidArgument",
        message: "Invalid notification argument",
      },
    };

    const mappedError = errorMap[errorCode] || {
      code: errorCode,
      message: "Failed to send notification",
    };

    throw Object.assign(new Error(mappedError.message), {
      code: mappedError.code,
      details: errorDetails,
    });
  }

  static async sendMultiPlatformNotification(
    tokens,
    title,
    body,
    data = {},
    customHandler = null
  ) {
    const results = [];

    for (const tokenData of tokens) {
      const token = typeof tokenData === "string" ? tokenData : tokenData.token;
      const platform =
        tokenData.platform || this.detectPlatformFromToken(token);

      console.log(
        `🔄 Processing token: ${token.substring(
          0,
          20
        )}... (detected platform: ${platform})`
      );

      try {
        const result = customHandler
          ? await customHandler(
              token,
              data.orderId,
              data.productId,
              data.quantity,
              data.isWarning === "true",
              data.isAutoReject === "true",
              {
                ...data,
                platform: platform,
              }
            )
          : await this.sendNotification(token, title, body, {
              ...data,
              platform: platform,
            });
        results.push({
          token: token.substring(0, 20) + "...",
          platform: platform,
          success: true,
          result,
        });
        console.log(
          `✅ Successfully sent to ${token.substring(0, 20)}... (${platform})`
        );
      } catch (error) {
        console.error(
          `❌ Failed to send to ${token.substring(0, 20)}... (${platform}):`,
          error.message
        );
        results.push({
          token: token.substring(0, 20) + "...",
          platform: platform,
          success: false,
          error: error.message,
          code: error.code,
        });
      }
    }

    return results;
  }

  // Add a specific method for testing web notifications
  static async sendTestWebNotification(deviceToken, testData = {}) {
    console.log(
      `🧪 Sending test web notification to: ${deviceToken.substring(0, 20)}...`
    );

    return this.sendNotification(
      deviceToken,
      "🧪 Test Web Notification",
      "This is a test notification to verify web notifications are working.",
      {
        type: "test_notification",
        platform: "web",
        orderId: "TEST_ORDER_123",
        transactionId: "TEST_TXN_456",
        redirectUrl: "https://aurify.ae/orders",
        adminLogo:
          "https://aurifyimage.s3.ap-south-1.amazonaws.com/1744013531086-swiss.webp",
        timestamp: new Date().toISOString(),
        ...testData,
      }
    );
  }

  static async sendWebNotification(deviceToken, title, body, data = {}) {
    console.log(
      `🌐 Sending web notification to token: ${deviceToken.substring(0, 20)}...`
    );
    return this.sendNotification(deviceToken, title, body, {
      ...data,
      platform: "web",
    });
  }

  static async sendAndroidNotification(deviceToken, title, body, data = {}) {
    return this.sendNotification(deviceToken, title, body, {
      ...data,
      platform: "android",
    });
  }

  static async sendIOSNotification(deviceToken, title, body, data = {}) {
    return this.sendNotification(deviceToken, title, body, {
      ...data,
      platform: "ios",
    });
  }

  static async sendOrderReminderNotification(
    deviceToken,
    orderId,
    productId,
    quantity,
    isWarning = false,
    isAutoReject = false,
    data = {}
  ) {
    const platform = data.platform || this.detectPlatformFromToken(deviceToken);

    let title, body;
    if (isAutoReject) {
      title = "⚠️ Order Auto-Rejected";
      body = `Order #${
        data.transactionId || orderId
      } was automatically rejected due to no response.`;
    } else if (isWarning) {
      title = "⏰ Final Reminder - Order Approval Required";
      body = `Your order #${
        data.transactionId || orderId
      } will be auto-rejected soon. Please confirm now!`;
    } else {
      title = "⏳ Order Approval Required";
      body = `Please approve your order #${
        data.transactionId || orderId
      } for ${quantity} items. Confirm to proceed.`;
    }

    return this.sendNotification(deviceToken, title, body, {
      ...data,
      type: "order_reminder",
      orderId,
      productId,
      quantity: quantity.toString(),
      isWarning: isWarning.toString(),
      isAutoReject: isAutoReject.toString(),
      platform,
    });
  }

  static async validateAndRemoveInvalidTokens(fcmTokens) {
    const validTokens = [];
    const invalidTokens = [];

    for (const tokenData of fcmTokens) {
      const token = typeof tokenData === "string" ? tokenData : tokenData.token;

      if (!token || typeof token !== "string" || token.trim() === "") {
        invalidTokens.push(tokenData);
        continue;
      }

      try {
        const message = {
          notification: { title: "Test", body: "Validation test" },
          token: token.trim(),
        };
        await admin.messaging().send(message, { dryRun: true });
        validTokens.push(tokenData);
        console.log(`✅ Token valid: ${token.substring(0, 20)}...`);
      } catch (error) {
        console.warn(
          `❌ Token validation failed for ${token.substring(0, 20)}...:`,
          error.code
        );
        if (
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/mismatched-credential"
        ) {
          invalidTokens.push(tokenData);
        } else {
          // For other errors (like network issues), consider token valid
          validTokens.push(tokenData);
        }
      }
    }

    console.log(
      `✅ Token validation complete: ${validTokens.length} valid, ${invalidTokens.length} invalid`
    );
    return { validTokens, invalidTokens };
  }

  static async sendBatchNotifications(notifications, batchSize = 500) {
    const results = [];
    const batches = [];

    for (let i = 0; i < notifications.length; i += batchSize) {
      batches.push(notifications.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(
        `📦 Processing batch ${i + 1}/${batches.length} with ${
          batch.length
        } notifications`
      );

      const batchPromises = batch.map(async (notification) => {
        try {
          const result = await this.sendNotification(
            notification.token,
            notification.title,
            notification.body,
            notification.data || {}
          );
          return { success: true, result };
        } catch (error) {
          return { success: false, error: error.message, code: error.code };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(
        ...batchResults.map(
          (r) => r.value || { success: false, error: r.reason }
        )
      );

      // Add delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export default EnhancedNotificationService;