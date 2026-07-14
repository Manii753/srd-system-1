import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import User from '@/models/User';
import '@/models/SRD'; // Import to register the SRD schema for populate()
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pusher from '@/lib/pusher-server';

const escapeRegExp = (string) => String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function GET(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    

    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const notifications = await Notification.find({ user: userId })
      .sort({ timestamp: -1 })
      .populate('srd', 'refNo');

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      targetRole,
      targetDepartment,
      users,
      message,
      srdId,
      action,
      metadata
    } = body;

    if (!message) {
      return NextResponse.json({ success: false, error: 'Notification message is required' }, { status: 400 });
    }

    let recipients = [];
    if (Array.isArray(users) && users.length > 0) {
      recipients = await User.find({ _id: { $in: users } });
    } else if (targetRole) {
      recipients = await User.find({ role: new RegExp(`^${escapeRegExp(targetRole)}$`, 'i') });
    } else if (targetDepartment) {
      recipients = await User.find({ department: new RegExp(`^${escapeRegExp(targetDepartment)}$`, 'i') });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'No notification recipients found' }, { status: 404 });
    }

    const notifications = recipients.map((user) => ({
      user: user._id,
      srd: srdId,
      action: action || 'info',
      targetDepartment: targetDepartment,
      message,
      read: false,
      timestamp: new Date(),
      metadata: metadata || {}
    }));

    await Notification.insertMany(notifications);

    try {
      if (process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET) {
        await pusher.trigger('notifications', 'notification:new', {
          targetRole,
          targetDepartment,
          srdId,
          action,
          message,
          metadata,
        });
      }
    } catch (pusherError) {
      console.warn('Pusher trigger failed for notification:new event:', pusherError.message);
    }

    return NextResponse.json({ success: true, message: 'Notification created' });
  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { ids } = await request.json();

    if (ids && Array.isArray(ids)) {
      await Notification.updateMany({ _id: { $in: ids }, user: userId }, { $set: { read: true } });
    } else {
      await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
    }

    return NextResponse.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error in PUT /api/notifications:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
