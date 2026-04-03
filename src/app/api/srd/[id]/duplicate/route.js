import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';

// Function to generate the next available refNo for duplicates/redos
const getNextRefNo = async (baseRefNo, isRedo) => {
  if (isRedo) {
    // Always strip back to the true base (remove any existing -R suffix)
    const redoRegex = /(-R\d+)$/;
    const trueBase = baseRefNo.replace(redoRegex, '');

    // Find the highest existing -Rn number from the true base
    const existingRedos = await SRD.find({
      refNo: { $regex: `^${trueBase}-R\\d+$` }
    }).select('refNo').lean();

    let maxNum = 0;
    for (const doc of existingRedos) {
      const match = doc.refNo.match(/-R(\d+)$/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    }

    const nextNum = maxNum + 1;
    const candidateRefNo = `${trueBase}-R${nextNum}`;

    return { refNo: candidateRefNo, suffix: `R-${nextNum}` };
  }

  // Handle duplicates (unchanged)
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
      images: _legacyImages,
      ...restOfSrd
    } = originalSrd;
    void _legacyImages;

    // Generate the new refNo
    const { refNo: newRefNo } = await getNextRefNo(refNo, isRedo);

    // Calculate new revision number
    const newRevision = (originalSrd.revision || 0) + 1;

    // Auto-populate refNo and old-refNo typed dynamic fields
    if (Array.isArray(restOfSrd.dynamicFields)) {
      restOfSrd.dynamicFields = restOfSrd.dynamicFields.map(field => {
        if (field.type === 'refNo') {
          return { ...field, value: newRefNo };
        }
        if (field.type === 'old-refNo' && isRedo) {
          return { ...field, value: originalSrd.refNo };
        }
        return field;
      });
    }

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




    return NextResponse.json({ success: true, data: newSrd });

  } catch (error) {
    console.error('Error duplicating SRD:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to duplicate SRD'
    }, { status: 500 });
  }
}
