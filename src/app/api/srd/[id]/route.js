import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import { notifySRDCompletion, notifySRDUpdate } from '@/lib/emailService';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    
    const srd = await SRD.findById(resolvedParams.id);
    
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

    // Email Notifications
    try {
      // Check if this update marks the SRD as completed
      // Checking both isComplete boolean and status string/object just in case
      const isCompleted = body.isComplete === true || body.status === 'completed';

      if (isCompleted) {
        await notifySRDCompletion(updatedSRD);
      } else {
        // Send update notification for other changes
        await notifySRDUpdate(updatedSRD, body);
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Continue execution, do not fail the request
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
    await dbConnect();
    const resolvedParams = await params;
    const deletedSRD = await SRD.findByIdAndDelete(resolvedParams.id);

    if (!deletedSRD) {
      return NextResponse.json(
        { success: false, error: "SRD not found" },
        { status: 404 }
      );
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
