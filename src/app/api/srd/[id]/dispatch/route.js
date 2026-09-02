import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import User from '@/models/User';
import Notification from '@/models/Notification';
import pusher from '@/lib/pusher-server';
import Dispatch from '@/models/Dispatch';
import Buyer from '@/models/Buyer';

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
          if (!payload.internalApproved) {
            if (!payload.internalRejectedReasons || !Array.isArray(payload.internalRejectedReasons) || payload.internalRejectedReasons.length < 1) {
              return NextResponse.json({ success: false, error: 'At least one rejection reason is required' }, { status: 400 });
            }
          }
          srd.internalApproved = payload.internalApproved;
          srd.internalApprovedBy = payload.internalApprovedBy;
          srd.internalApprovedDate = new Date();
          srd.internalComments = payload.internalComments;
          if (!payload.internalApproved && payload.internalRejectedReasons) {
            srd.internalRejectedReasons = payload.internalRejectedReasons;
          }
          
          actionDescription = payload.internalApproved ? 'Internal Verification Approved' : 'Internal Verification Rejected';
        } else if (action === 'save_dispatch_details') {
          // Find or create dispatch details
          let dispatch;
          if (srd.DispatchDetails) {
            dispatch = await Dispatch.findById(srd.DispatchDetails);
          }
          
          if (!dispatch) {
            dispatch = new Dispatch({});
          }
          
          // Update dispatch fields
          if (payload.awb !== undefined) dispatch.awb = payload.awb;
          if (payload.dispatchQuantity !== undefined) dispatch.dispatchQuantity = payload.dispatchQuantity;
          if (payload.address !== undefined) dispatch.address = payload.address;
          if (payload.sampleDispatchDate !== undefined) dispatch.sampleDispatchDate = payload.sampleDispatchDate;
          if (payload.images !== undefined) dispatch.images = payload.images;
          
          await dispatch.save();
          
          srd.DispatchDetails = dispatch._id;
          if (payload.BuyerDetails) {
            srd.BuyerDetails = payload.BuyerDetails;
          }
          
          actionDescription = 'Dispatch Details Updated';
        } else if (action === 'dispatch_to_buyer') {
          srd.sampleDispatchedToBuyer = true;
          
          // Use existing date from Dispatch model if available, otherwise use now
          let dDate = new Date();
          if (srd.DispatchDetails) {
            const disp = await Dispatch.findById(srd.DispatchDetails);
            if (disp && disp.sampleDispatchDate) {
              dDate = disp.sampleDispatchDate;
            } else if (disp) {
              disp.sampleDispatchDate = dDate;
              await disp.save();
            }
          }
          srd.sampleDispatchDate = dDate;
          
          actionDescription = 'Sample Dispatched to Buyer';
        } else if (action === 'buyer_approval') {
          if (!payload.BuyerApproved) {
            if (!payload.BuyerRejectedReasons || !Array.isArray(payload.BuyerRejectedReasons) || payload.BuyerRejectedReasons.length < 1) {
              return NextResponse.json({ success: false, error: 'At least one rejection reason is required' }, { status: 400 });
            }
          }
          srd.BuyerApproved = payload.BuyerApproved;
          srd.BuyerApprovedBy = payload.BuyerApprovedBy;
          srd.BuyerApprovedDate = new Date();
          srd.BuyerComments = payload.BuyerComments;
          if (!payload.BuyerApproved && payload.BuyerRejectedReasons) {
            srd.BuyerRejectedReasons = payload.BuyerRejectedReasons;
          }
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
        freshSRD = await SRD.findById(id).populate('BuyerDetails DispatchDetails').lean();
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
