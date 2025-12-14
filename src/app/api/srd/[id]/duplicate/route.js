import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import User from '@/models/User';

// Function to generate the next available refNo for duplicates/redos
const getNextRefNo = async (baseRefNo, isRedo) => {
  if (isRedo) {
    const redoRegex = /(-R)(\d+)$/;
    const match = baseRefNo.match(redoRegex);

    if (match) {
      const nextNum = parseInt(match[2], 10) + 1;
      return baseRefNo.replace(redoRegex, `$1${nextNum}`);
    }
    return `${baseRefNo}-R1`;
  }

  // Handle duplicates
  let newRefNo = `${baseRefNo}-COPY`;
  let counter = 2;
  while (await SRD.findOne({ refNo: newRefNo })) {
    newRefNo = `${baseRefNo}-COPY-${counter}`;
    counter++;
  }
  return newRefNo;
};

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const isRedo = action === 'redo';

    const originalSrd = await SRD.findById(id).lean();

    if (!originalSrd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    // Create a new SRD object, stripping fields that should not be copied
    const { 
      _id, 
      createdAt, 
      updatedAt, 
      refNo,
      progress,
      status,
      inProduction,
      readyForProduction,
      productionStartDate,
      productionEndDate,
      productionProgress,
      productionHistory,
      comments,
      audit,
      ...restOfSrd 
    } = originalSrd;

    // Generate the new refNo
    const newRefNo = await getNextRefNo(refNo, isRedo);

    const newSrd = new SRD({
      ...restOfSrd,
      refNo: newRefNo,
      title: isRedo ? originalSrd.title : `${originalSrd.title} (Copy)`,
      
      // Reset progress and status fields to their defaults
      progress: 0,
      status: {
        vmd: 'pending',
        cad: 'pending',
        commercial: 'pending',
        mmc: 'pending',
      },
      inProduction: false,
      readyForProduction: false,
      productionProgress: 0,
      productionHistory: [],
      comments: [],
      audit: [{
        action: isRedo ? 'redo' : 'duplicate',
        author: 'System',
        details: { from: originalSrd.refNo }
      }],
      
      // Keep createdBy from original
      createdBy: originalSrd.createdBy, 
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newSrd.save();

    return NextResponse.json({ success: true, data: newSrd });

  } catch (error) {
    console.error('Error duplicating SRD:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
