import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';

export async function POST(request) {
  await dbConnect();
  const body = await request.json();
  const { oldValue, newValue } = body;

  if (!oldValue && !newValue) {
    return NextResponse.json({
      success: false,
      error: 'Either oldValue or newValue must be provided',
    }, { status: 400 });
  }

  if (oldValue && newValue) {
    // Bulk rename: update all SRDs that have the old sample type value
    const result = await SRD.updateMany(
      { 'dynamicFields.value': oldValue, 'dynamicFields.slug': 'sample-type' },
      { $set: { 'dynamicFields.$.value': newValue } }
    );
    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  }

  if (oldValue && !newValue) {
    // Bulk delete: clear the sample type value
    const result = await SRD.updateMany(
      { 'dynamicFields.value': oldValue, 'dynamicFields.slug': 'sample-type' },
      { $unset: { 'dynamicFields.$.value': '' } }
    );
    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  }

  return NextResponse.json({
    success: false,
    error: 'Invalid operation',
  }, { status: 400 });
}