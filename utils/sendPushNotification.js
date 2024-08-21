import admin from "./firebase.js"

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
                priority: 'high',
            },
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: title,
                            body: body,
                        },
                        sound: 'default',
                    },
                },
            },
        };

        try {
            const response = await admin.messaging().send(message);
            return response;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }
}

export default NotificationService;
