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

    const users = await User.find({ isActive: true })
      .select('name email department role')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching representatives:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
