const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send a push notification to one or more users.
 * @param {string[]} pushTokens - Expo push tokens (filter out nulls before calling)
 * @param {string} title
 * @param {string} body
 * @param {object} data - extra payload, e.g. { screen: 'home', tripId: '...' }
 */
async function sendPushNotifications(pushTokens, title, body, data = {}) {
  const validTokens = pushTokens.filter((t) => t && Expo.isExpoPushToken(t));
  if (validTokens.length === 0) return;

  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error('Push notification error:', err.message);
    }
  }
}

module.exports = { sendPushNotifications };