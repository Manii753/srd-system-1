import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function isValidSrdId(id) {
  return id && id !== 'undefined' && mongoose.Types.ObjectId.isValid(id);
}

// PATCH - Upload/replace the wash analysis report
export async function PATCH(request, context) {
  await dbConnect();
  const { id } = await context.params;
  if (!isValidSrdId(id)) {
    return NextResponse.json({ success: false, error: 'Invalid SRD id' }, { status: 400 });
  }
  const session = await getServerSession(authOptions);

  try {
    const { url, name } = await request.json();

    const srd = await SRD.findByIdAndUpdate(
      id,
      {
        $set: {
          'washAnalysisReport.url': url,
          'washAnalysisReport.name': name,
          'washAnalysisReport.uploadedAt': new Date(),
          'washAnalysisReport.uploadedBy': session?.user?.name || 'Unknown',
          updatedAt: new Date(),
        }
      },
      { new: true }
    );
    if (!srd) return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: srd.washAnalysisReport });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Remove the wash analysis report
export async function DELETE(request, context) {
  await dbConnect();
  const { id } = await context.params;
  if (!isValidSrdId(id)) {
    return NextResponse.json({ success: false, error: 'Invalid SRD id' }, { status: 400 });
  }

  try {
    const srd = await SRD.findByIdAndUpdate(
      id,
      { $set: { washAnalysisReport: { url: null, name: null, uploadedAt: null, uploadedBy: null } } },
      { new: true }
    );

    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: srd.washAnalysisReport });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
