import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';

// Update customer approval status
export async function PATCH(request, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const body = await request.json();
    const { status, comments, completedBy } = body;

    const srd = await SRD.findById(id);
    if (!srd) {
      return NextResponse.json(
        { success: false, error: 'SRD not found' },
        { status: 404 }
      );
    }

    if (!srd.isComplete) {
      return NextResponse.json(
        { success: false, error: 'Production must be complete to submit customer approval' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
        return NextResponse.json(
            { success: false, error: 'Invalid customer approval status' },
            { status: 400 }
          );
    }

    srd.customerApproval = {
        status,
        comments: comments || '',
        by: completedBy || 'System',
        date: new Date()
    };
    
    // Add audit entry
    srd.audit.push({
      action: `customer_approval_${status}`,
      department: 'production',
      author: completedBy || 'System',
      timestamp: new Date(),
      details: {
        comments
      }
    });

    await srd.save();

    return NextResponse.json({
      success: true,
      data: srd,
      message: `Customer approval updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating customer approval:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
