import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';

// Function to generate the next available refNo for duplicates/redos
const getNextRefNo = async (baseRefNo, isRedo) => {
  if (isRedo) {
    const redoRegex = /(-R)(\d+)$/;
    const match = baseRefNo.match(redoRegex);

    let nextNum = 1;
    let candidateRefNo;

    if (match) {
      nextNum = parseInt(match[2], 10) + 1;
      candidateRefNo = baseRefNo.replace(redoRegex, `$1${nextNum}`);
    } else {
      candidateRefNo = `${baseRefNo}-R${nextNum}`;
    }

    // Ensure uniqueness by incrementing until we find an available refNo
    while (await SRD.findOne({ refNo: candidateRefNo })) {
      nextNum++;
      if (match) {
        candidateRefNo = baseRefNo.replace(redoRegex, `$1${nextNum}`);
      } else {
        candidateRefNo = `${baseRefNo}-R${nextNum}`;
      }
    }

    return { refNo: candidateRefNo, suffix: `R-${nextNum}` };
  }

  // Handle duplicates
  let newRefNo = `${baseRefNo}-COPY`;
  let counter = 2;
  
  while (await SRD.findOne({ refNo: newRefNo })) {
    newRefNo = `${baseRefNo}-COPY-${counter}`;
    counter++;
  }

  return { refNo: newRefNo, suffix: '(Copy)' };
};

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const isRedo = action === 'redo';

    // TODO: Add authentication to get the actual user
    // const session = await getServerSession();
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

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
      revision,
      ...restOfSrd 
    } = originalSrd;

    // Generate the new refNo
    const { refNo: newRefNo } = await getNextRefNo(refNo, isRedo);

    // Calculate new revision number
    const newRevision = (originalSrd.revision || 0) + 1;

    const newSrd = new SRD({
      ...restOfSrd,
      refNo: newRefNo,
      
      revision: newRevision,
      
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
        details: { 
          from: originalSrd.refNo,
          timestamp: new Date()
        }
      }],
      
      // Keep createdBy from original
      createdBy: originalSrd.createdBy, 
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newSrd.save();

    // If this is a redo, delete the original SRD
    if (isRedo) {
      await SRD.findByIdAndDelete(id);
    }

    return NextResponse.json({ success: true, data: newSrd });

  } catch (error) {
    console.error('Error duplicating SRD:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to duplicate SRD' 
    }, { status: 500 });
  }
}