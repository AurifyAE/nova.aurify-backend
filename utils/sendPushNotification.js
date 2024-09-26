import admin from "./firebase.js";

class NotificationService {
  static async sendNotification(deviceToken, title, body, data = {}) {
    if (!deviceToken || typeof deviceToken !== 'string' || deviceToken.trim() === '') {
      console.error("Invalid device token:", deviceToken);
      throw new Error("Invalid device token");
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: deviceToken.trim(),
      data: data,
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
      return response;
    } catch (error) {
      console.error("Error sending notification:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw error;
    }
  }
}

export default NotificationService;