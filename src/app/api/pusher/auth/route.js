import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pusher from '@/lib/pusher-server';

export async function POST(request) {
  try {
    if (!pusher.authorizeChannel) {
      return NextResponse.json({ error: 'Pusher authentication is not available' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { socket_id: socketId, channel_name: channelName } = body;

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'socket_id and channel_name are required' }, { status: 400 });
    }

    let authResponse;
    if (channelName.startsWith('presence-')) {
      authResponse = pusher.authorizeChannel(socketId, channelName, {
        user_id: session.user.id,
        user_info: {
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        },
      });
    } else {
      authResponse = pusher.authorizeChannel(socketId, channelName);
    }

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Error authorizing Pusher channel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}