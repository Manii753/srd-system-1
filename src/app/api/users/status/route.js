import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import pusher from '@/lib/pusher-server';

// POST - Update user online status
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { status } = body; // 'online', 'offline', 'away'

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update user status
    user.onlineStatus = status;
    user.lastSeen = new Date();
    await user.save();

    // Broadcast status change via Pusher
    await pusher.trigger('presence', 'status-change', {
      userId: user._id.toString(),
      email: user.email,
      status: status,
      lastSeen: user.lastSeen,
    });

    return NextResponse.json({
      success: true,
      data: {
        status: user.onlineStatus,
        lastSeen: user.lastSeen,
      },
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET - Get all users with their online status
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const users = await User.find({}, 'name email role onlineStatus lastSeen')
      .sort({ onlineStatus: -1, lastSeen: -1 });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching user status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
