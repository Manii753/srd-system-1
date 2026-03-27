import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import User from '@/models/User';
import Notification from '@/models/Notification';
import pusher from '@/lib/pusher-server';

export async function PATCH(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    let freshSRD;
    let retries = 3;

    while (retries > 0) {
      try {
        const srd = await SRD.findById(id);

        if (!srd) {
          return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
        }

        const { action, payload } = body;

        let actionDescription = '';

        if (action === 'internal_approval') {
          srd.internalApproved = payload.internalApproved;
          srd.internalApprovedBy = payload.internalApprovedBy;
          srd.internalApprovedDate = new Date();
          srd.internalComments = payload.internalComments;
          if (payload.BuyerDetails) {
            srd.BuyerDetails = payload.BuyerDetails;
          }
          
          if (payload.internalApproved) {
            srd.sampleDispatchedToBuyer = true;
          }
          actionDescription = payload.internalApproved ? 'Internal Verification Approved' : 'Internal Verification Rejected';
        } else if (action === 'buyer_approval') {
          srd.BuyerApproved = payload.BuyerApproved;
          srd.BuyerApprovedBy = payload.BuyerApprovedBy;
          srd.BuyerApprovedDate = new Date();
          srd.BuyerComments = payload.BuyerComments;
          actionDescription = payload.BuyerApproved ? 'Buyer Approved' : 'Buyer Rejected';
        } else if (action === 'final_dispatch') {
          srd.dispatchBy = payload.dispatchBy;
          srd.dispatchNotes = payload.dispatchNotes;
          srd.dispatchDate = new Date();
          actionDescription = 'Final Dispatch Completed';
        } else {
          return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }

        srd.updatedAt = new Date();

        // Add audit record
        srd.audit.push({
          department: 'dispatch',
          author: payload.author || payload.internalApprovedBy || payload.BuyerApprovedBy || payload.dispatchBy || 'System',
          action: actionDescription,
          comment: payload.comment || payload.internalComments || payload.BuyerComments || payload.dispatchNotes,
          date: new Date(),
        });

        await srd.save();
        freshSRD = await SRD.findById(id).lean();
        break; // Success
      } catch (err) {
        if (err.name === 'VersionError' && retries > 1) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 100)); // jitter
          continue;
        }
        throw err;
      }
    }

    if (!freshSRD) {
      throw new Error('Failed to update SRD after retries');
    }

    // Create notifications for all users
    try {
      const users = await User.find({});
      const notificationMessage = `📦 Dispatch update on SRD ${freshSRD.refNo}: ${body.action.replace('_', ' ')}`;

      const notificationPromises = users.map(user =>
        Notification.create({
          user: user._id,
          srd: freshSRD._id,
          message: notificationMessage,
          read: false,
        })
      );
      await Promise.all(notificationPromises);
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
    }

    // Trigger Pusher event
    await pusher.trigger(`srd-${id}`, 'srd:update', {
      department: 'dispatch',
      action: body.action
    });

    return NextResponse.json({
      success: true,
      data: freshSRD,
      message: 'Dispatch details updated successfully',
    });
  } catch (error) {
    console.error('Error updating dispatch:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
