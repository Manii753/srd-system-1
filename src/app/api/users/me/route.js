import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id)
      .select('name email role department permissions sidebarMenuItems isActive')
      .lean();

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'User not found or inactive' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: user.permissions || {},
        sidebarMenuItems: user.sidebarMenuItems || [],
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}