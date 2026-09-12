import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import User from '@/models/User';
import Company from '@/models/Company';
import '@/models/Buyer';
import '@/models/Dispatch';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    
    const srd = await SRD.findById(resolvedParams.id).populate('BuyerDetails DispatchDetails');
    
    if (!srd) {
      return NextResponse.json({
        success: false,
        error: 'SRD not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: srd
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    const body = await request.json();
    const updatedSRD = await SRD.findByIdAndUpdate(resolvedParams.id, body, { new: true, runValidators: true });
    
    if (!updatedSRD) {
      return NextResponse.json({
        success: false,
        error: 'SRD not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: updatedSRD,
      message: 'SRD updated successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findById(session.user.id)
      .select('role permissions isActive')
      .lean();

    const canDeleteSRD =
      user && user.isActive && (
        user.role === 'admin' || user.permissions?.canDeleteSRD === true
      );

    if (!canDeleteSRD) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete SRDs' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const deletedSRD = await SRD.findByIdAndDelete(resolvedParams.id);

    if (!deletedSRD) {
      return NextResponse.json(
        { success: false, error: "SRD not found" },
        { status: 404 }
      );
    }

    // Reclaim the inquiry number if the deleted SRD was the latest one,
    // so the next SRD created reuses the same number (no missing numbers).
    if (deletedSRD.refNo) {
      const numberMatch = String(deletedSRD.refNo).match(/(\d+)(?:-R\d+)?$/);
      if (numberMatch) {
        try {
          const deletedNumber = parseInt(numberMatch[1], 10);
          const prefix = String(deletedSRD.refNo).replace(numberMatch[0], '');
          const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const allSRDs = await SRD.find(
            { refNo: { $regex: `^${escapedPrefix}\\d+` } },
            'refNo'
          ).lean();

          let maxRemaining = 0;
          for (const s of allSRDs) {
            const m = s.refNo.match(/(\d+)(?:-R\d+)?$/);
            if (m) maxRemaining = Math.max(maxRemaining, parseInt(m[1], 10));
          }

          if (deletedNumber > maxRemaining) {
            await Company.updateOne(
              {},
              { $set: { currentSRDNumber: deletedNumber - 1 } },
              { upsert: true, setDefaultsOnInsert: true }
            );
          }
        } catch (counterError) {
          console.error('Error reclaiming SRD number:', counterError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {},
      message: "SRD deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
