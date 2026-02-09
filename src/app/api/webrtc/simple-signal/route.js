import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import pusher from '@/lib/pusher-server';

export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, signal } = body;

    // Validate required fields
    if (!to || !signal || !signal.type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: to, signal, signal.type'
      }, { status: 400 });
    }


    // Enhanced signal data with metadata
    const signalData = {
      from: session.user.email,
      signal: signal,
      timestamp: Date.now(),
      sessionId: session.user.email + '-' + Date.now()
    };

    // Send signal via Pusher with error handling
    try {
      await pusher.trigger(`call-${to}`, 'signal', signalData);

    } catch (pusherError) {
      console.error('❌ Pusher error:', pusherError);
      return NextResponse.json({
        success: false,
        error: 'Failed to send signal via Pusher'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Signal sent successfully',
      signalType: signal.type
    });

  } catch (error) {
    console.error('❌ WebRTC signaling error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
