import admin from "./firebase.js";

class NotificationService {
  static async sendNotification(deviceToken, title, body, data = {}) {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: deviceToken,
      data: data, // Optional data payload, e.g., { key1: 'value1', key2: 'value2' }
      android: {
        priority: "high", // Set high priority for Android notifications
        notification: {
          sound: "default", // Set the sound for Android
          channelId: "high_importance_channel", // Optional: Use a specific notification channel for high-priority sounds
        },
      },

      apns: {
        headers: {
          "apns-priority": "10", // Set high priority for iOS notifications
        },
        payload: {
          aps: {
            alert: {
              title: title,
              body: body,
            },
            sound: "default",
            "content-available": 1, // Ensure high priority for background notifications
          },
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      return response;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }
}

export default NotificationService;
