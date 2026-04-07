import webpush from 'web-push';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@srds.com'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a push notification to an array of users.
 * Silently cleans up expired/invalid subscriptions.
 *
 * @param {Array} users - Mongoose User documents
 * @param {{ title: string, body: string, url?: string }} options
 */
export async function sendPushToUsers(users, { title, body, url = '/' }) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured — skipping push notifications');
    return;
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: { url },
  });

  for (const user of users) {
    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) continue;

    const invalidEndpoints = [];

    await Promise.all(
      user.pushSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription, payload);
        } catch (error) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            invalidEndpoints.push(subscription.endpoint);
          } else {
            console.error(`Push failed for user ${user.email}:`, error.message);
          }
        }
      })
    );

    if (invalidEndpoints.length > 0) {
      user.pushSubscriptions = user.pushSubscriptions.filter(
        (sub) => !invalidEndpoints.includes(sub.endpoint)
      );
      await user.save().catch((e) => console.error('Failed to remove stale subscriptions:', e));
    }
  }
}
