import admin from "./firebase.js";

class NotificationService {
  static async sendNotification(deviceToken, title, body, data = {}) {
    // Validate the device token
    if (
      !deviceToken ||
      typeof deviceToken !== "string" ||
      deviceToken.trim() === ""
    ) {
      console.error("Invalid device token:", deviceToken);
      throw new Error("Invalid device token");
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: deviceToken.trim(),
      data: {
        ...data,
        type: data.type || "default_notification",
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "high_importance_channel",
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title: title,
              body: body,
            },
            sound: "default",
            "content-available": 1,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      console.log("Notification sent successfully:", response);
      return response;
    } catch (error) {
      // Handle specific Firebase errors
      if (
        error.errorInfo &&
        error.errorInfo.code === "messaging/registration-token-not-registered"
      ) {
        console.error(
          `The device token ${deviceToken} is not registered or has expired.`
        );
        throw new Error(
          `Device token ${deviceToken} is not registered or has expired.`
        );
      } else {
        console.error("Error sending notification:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }
    }
  }

  // New method for sending quantity confirmation notifications
  static async sendQuantityConfirmationNotification(
    deviceToken,
    orderId,
    itemId,
    quantity
  ) {
    const title = "⚡Action Required: Stock Exceeded!";
    const body = `🔔 Quantity Exceeded! Requested ${quantity}. Proceed with update? `;
    if (
      !deviceToken ||
      typeof deviceToken !== "string" ||
      deviceToken.trim() === ""
    ) {
      console.error("Invalid device token:", deviceToken);
      throw new Error("Invalid device token");
    }

    const data = {
      type: "order_quantity_confirmation",
      orderId: orderId.toString(),
      title,
      body,
      itemId: itemId.toString(),
      quantity: quantity.toString(),
    };

    const message = {
      token: deviceToken.trim(),
      data: {
        ...data,
      },
    };
    try {
      const response = await admin.messaging().send(message);
      console.log("Notification sent successfully:", response);
      return response;
    } catch (error) {
      // Handle specific Firebase errors
      if (
        error.errorInfo &&
        error.errorInfo.code === "messaging/registration-token-not-registered"
      ) {
        console.error(
          `The device token ${deviceToken} is not registered or has expired.`
        );
        throw new Error(
          `Device token ${deviceToken} is not registered or has expired.`
        );
      } else {
        console.error("Error sending notification:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }
    }
  }

  static async sendWarningNotification(deviceToken, title, body, info) {
    if (
      !deviceToken ||
      typeof deviceToken !== "string" ||
      deviceToken.trim() === ""
    ) {
      console.error("Invalid device token:", deviceToken);
      throw new Error("Invalid device token");
    }

    const data = {
      type: "order_quantity_confirmation",
      orderId: info.orderId,
      title,
      body,
      itemId: info.itemId,
      notificationType: "warning"
    };

    const message = {
      token: deviceToken.trim(),
      notification: {
        title: title || "⏳ Confirmation Countdown! 🕒",
        body: body
      },
      data: {
        ...data,
      },
    };
    try {
      const response = await admin.messaging().send(message);
      console.log("Notification sent successfully:", response);
      return response;
    } catch (error) {
      // Handle specific Firebase errors
      if (
        error.errorInfo &&
        error.errorInfo.code === "messaging/registration-token-not-registered"
      ) {
        console.error(
          `The device token ${deviceToken} is not registered or has expired.`
        );
        throw new Error(
          `Device token ${deviceToken} is not registered or has expired.`
        );
      } else {
        console.error("Error sending notification:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }
    }
  }

  static async sendRejectNotification(deviceToken, title, body, info) {
    if (
      !deviceToken ||
      typeof deviceToken !== "string" ||
      deviceToken.trim() === ""
    ) {
      console.error("Invalid device token:", deviceToken);
      throw new Error("Invalid device token");
    }

    const data = {
      orderId: info.orderId,
      title,
      body,
      itemId: info.itemId,
      notificationType: "reject"
    };

    const message = {
      token: deviceToken.trim(),
      notification: {
        title: title || "❌ Order Auto-Canceled 🚫",
        body: body
      },
      data: {
        ...data,
      },
    };
    try {
      const response = await admin.messaging().send(message);
      console.log("Notification sent successfully:", response);
      return response;
    } catch (error) {
      // Handle specific Firebase errors
      if (
        error.errorInfo &&
        error.errorInfo.code === "messaging/registration-token-not-registered"
      ) {
        console.error(
          `The device token ${deviceToken} is not registered or has expired.`
        );
        throw new Error(
          `Device token ${deviceToken} is not registered or has expired.`
        );
      } else {
        console.error("Error sending notification:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }
    }
  }

  static async sendSuccessNotification(deviceToken, title, body, info) {
    if (
      !deviceToken ||
      typeof deviceToken !== "string" ||
      deviceToken.trim() === ""
    ) {
      console.error("Invalid device token:", deviceToken);
      throw new Error("Invalid device token");
    }

    const data = {
      orderId: info.orderId,
      title,
      body,
      itemId: info.itemId,
    };

    const message = {
      token: deviceToken.trim(),
      data: {
        ...data,
      },
    };
    try {
      const response = await admin.messaging().send(message);
      console.log("Notification sent successfully:", response);
      return response;
    } catch (error) {
      // Handle specific Firebase errors
      if (
        error.errorInfo &&
        error.errorInfo.code === "messaging/registration-token-not-registered"
      ) {
        console.error(
          `The device token ${deviceToken} is not registered or has expired.`
        );
        throw new Error(
          `Device token ${deviceToken} is not registered or has expired.`
        );
      } else {
        console.error("Error sending notification:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }
    }
  }

  // New method for sending order reminder notification
  static async sendOrderReminderNotification(deviceToken, orderId, itemId, quantity, isWarning = false, isAutoReject = false) {
    if (!deviceToken || typeof deviceToken !== "string" || deviceToken.trim() === "") {
      console.error("Invalid device token:", deviceToken);
      throw new Error("Invalid device token");
    }
  
    let title, body, notificationType;
  
    if (isAutoReject) {
      title = "❌ Order Auto-Canceled 🚫";
      body = `⚠️ Auto-Rejected! (Qty: ${quantity}) No response detected. Retry? 🔄`;
      notificationType = "reject";
    } else if (isWarning) {
      title = "⏳ Confirmation Countdown! 🕒";
      body = `Review & confirm item quantity (${quantity}) before time runs out!`;
      notificationType = "warning";
    } else {
      title = "⚡Action Required: Order Confirmation";
      body = `Please confirm your order with quantity: ${quantity}`;
      notificationType = "confirmation";
    }
  
    const notificationPayload = {
      notification: {
        title: title,
        body: body
      },
      data: {
        orderId: orderId.toString(),
        itemId: itemId.toString(),
        quantity: quantity.toString(),
        notificationType: notificationType,
        title: title,  // Duplicate in data for compatibility
        body: body,    // Duplicate in data for compatibility
        message: body  // Additional field for some client implementations
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "high_importance_channel",
          clickAction: "FLUTTER_NOTIFICATION_CLICK"
        }
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title: title,
              body: body
            },
            sound: "default",
            badge: 1,
            "content-available": 1
          }
        }
      },
      token: deviceToken.trim()
    };
  
    try {
      const response = await admin.messaging().send(notificationPayload);
      console.log(`${notificationType} notification sent successfully:`, response);
      return response;
    } catch (error) {
      if (
        error.code === "messaging/registration-token-not-registered" ||
        (error.message && error.message.includes("is not registered"))
      ) {
        console.error(`The device token ${deviceToken} is not registered or has expired.`);
        throw new Error(`Device token ${deviceToken} is not registered or has expired.`);
      } else {
        console.error("Error sending notification:", error);
        throw error;
      }
    }
  }

  // Helper method to validate FCM tokens
  static async validateAndRemoveInvalidTokens(fcmTokens) {
    const validTokens = [];
    const invalidTokens = [];

    for (const token of fcmTokens) {
      try {
        // Make a simple FCM request to validate the token
        const message = {
          data: { test: "true" },
          token: token
        };
        await admin.messaging().send(message, { dryRun: true });
        validTokens.push(token);
      } catch (error) {
        if (
          error.code === "messaging/registration-token-not-registered" ||
          (error.message && error.message.includes("is not registered"))
        ) {
          invalidTokens.push(token);
        } else {
          // For other errors, consider the token valid
          validTokens.push(token);
        }
      }
    }

    return { validTokens, invalidTokens };
  }
}

export default NotificationService;