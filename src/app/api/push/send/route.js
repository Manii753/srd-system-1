import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import webpush from 'web-push';

// Configure web-push with VAPID keys
// Generate keys with: npx web-push generate-vapid-keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@srds.com'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { to, title, body, data } = await request.json();

    // Get recipient user
    const recipient = await User.findOne({ email: to });
    if (!recipient || !recipient.pushSubscriptions || recipient.pushSubscriptions.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Recipient has no push subscriptions' 
      }, { status: 404 });
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: title || 'MMS Notification',
      body: body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: data || {}
    });

    // Send to all user's subscriptions
    const sendPromises = recipient.pushSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        return { success: true, endpoint: subscription.endpoint };
      } catch (error) {
        console.error('Failed to send to subscription:', error);
        
        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          recipient.pushSubscriptions = recipient.pushSubscriptions.filter(
            sub => sub.endpoint !== subscription.endpoint
          );
          await recipient.save();
        }
        
        return { success: false, endpoint: subscription.endpoint, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Push notifications sent: ${successCount}/${results.length}`);

    return NextResponse.json({ 
      success: true, 
      message: `Sent to ${successCount} device(s)`,
      results 
    });

  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}