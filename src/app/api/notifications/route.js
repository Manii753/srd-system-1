import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    console.log("sessin in notifications",session);

    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const notifications = await Notification.find({ user: userId }).sort({ timestamp: -1 });

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
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
