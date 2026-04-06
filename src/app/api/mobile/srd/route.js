import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const refNo = searchParams.get('refNo');

    if (!refNo || !refNo.trim()) {
      return NextResponse.json({ success: false, error: 'refNo is required' }, { status: 400 });
    }

    await dbConnect();

    const srd = await SRD.findOne(
      { refNo: { $regex: `^${refNo.trim()}$`, $options: 'i' } },
      // Only return the fields needed for mobile modules (lightweight)
      {
        _id: 1,
        refNo: 1,
        title: 1,
        description: 1,
        status: 1,
        progress: 1,
        isComplete: 1,
        readyForProduction: 1,
        inProduction: 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
        BuyerDetails: 1,
        dynamicFields: 1,
      }
    ).lean();

    if (!srd) {
      return NextResponse.json({ success: false, error: `No SRD found with ref "${refNo.trim()}"` }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: srd });
  } catch (error) {
    console.error('GET /api/mobile/srd error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
