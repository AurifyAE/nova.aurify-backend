import admin from "./firebase.js";

class NotificationService {
  static async sendNotification(deviceToken, title, body, data = {}) {
    // Validate the device token
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
          channelId: "high_importance_channel", // Ensure this channel is created in the Android app
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
      // Send the notification using Firebase Admin SDK
      const response = await admin.messaging().send(message);
      console.log("Notification sent successfully:", response);
      return response;
    } catch (error) {
      // Handle specific Firebase errors
      if (error.errorInfo && error.errorInfo.code === 'messaging/registration-token-not-registered') {
        console.error(`The device token ${deviceToken} is not registered or has expired.`);
        
        // Example: Remove token from database here
        // await database.removeDeviceToken(deviceToken);
        
        // Optionally return an error or handle this logic as needed
        throw new Error(`Device token ${deviceToken} is not registered or has expired.`);
      } else {
        // Log the error for other failures
        console.error("Error sending notification:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;  // Re-throw other errors
      }
    }
  }
}

export default NotificationService;
