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
    const title = "Confirm Quantity Update";
    const body = `Are you sure you want to update the quantity to ${quantity}?`;
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
}

export default NotificationService;
