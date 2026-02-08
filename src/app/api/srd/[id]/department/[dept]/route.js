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
    const { id, dept } = params;
    const body = await request.json();

    let freshSRD;
    let retries = 3;

    while (retries > 0) {
      try {
        const srd = await SRD.findById(id);

        if (!srd) {
          return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
        }

        // Validate required comment when flagging
        if (body.status === 'flagged' && (!body.comment || !body.comment.text)) {
          return NextResponse.json({ success: false, error: 'Comment is required when flagging an SRD' }, { status: 400 });
        }

        // 🔹 FIX: Update status properly
        if (!srd.status) {
          srd.status = {};
        }

        // Create a new object to ensure Mongoose detects the change
        const updatedStatus = { ...srd.status };
        updatedStatus[dept] = body.status;
        srd.status = updatedStatus;
        srd.markModified('status');

        // --- MOVED PROGRESS CALCULATION LOGIC HERE ---
        const departmentStatuses = srd.status;
        const excludedDepts = ['admin', 'production-manager', 'vmd'];
        let relevantDeptCount = 0;
        let approvedDeptCount = 0;

        for (const deptKey in departmentStatuses) {
          if (!excludedDepts.includes(deptKey)) {
            relevantDeptCount++;
            if (departmentStatuses[deptKey] === 'approved') {
              approvedDeptCount++;
            }
          }
        }

        if (relevantDeptCount > 0) {
          srd.progress = Math.round((approvedDeptCount / relevantDeptCount) * 100);
          srd.readyForProduction = approvedDeptCount === relevantDeptCount;
        } else {
          srd.progress = 0;
          srd.readyForProduction = false;
        }
        // --- END OF MOVED LOGIC ---

        srd.updatedAt = new Date();

        // Update dynamic fields
        if (body.fields && Array.isArray(body.fields) && body.fields.length > 0) {
          // Update existing dynamicFields array
          body.fields.forEach(updatedField => {
            const existingFieldIndex = srd.dynamicFields.findIndex(
              f => f.name === updatedField.name && f.department === dept
            );

            if (existingFieldIndex > -1) {
              // Update existing field - preserve metadata
              const currentField = srd.dynamicFields[existingFieldIndex];
              srd.dynamicFields[existingFieldIndex] = {
                ...currentField.toObject(),
                ...updatedField,
                department: dept // Ensure department stays correct
              };
            } else {
              // Add new field - include all metadata
              srd.dynamicFields.push({
                ...updatedField,
                department: dept
              });
            }
          });
          srd.markModified('dynamicFields');
        }

        // Add comment if provided
        if (body.comment && body.comment.text) {
          srd.comments.push({
            department: dept,
            author: body.comment.author,
            role: body.comment.role,
            text: body.comment.text,
            date: new Date(),
          });
        }

        // Add audit record with detailed action description
        const actionDescription = body.status === 'flagged'
          ? `Flagged issue in ${dept.toUpperCase()}`
          : body.status === 'approved'
            ? `Approved by ${dept.toUpperCase()}`
            : body.status === 'in-progress'
              ? `Updated to In Progress by ${dept.toUpperCase()}`
              : `Updated status to ${body.status} by ${dept.toUpperCase()}`;

        srd.audit.push({
          department: dept,
          author: body.comment?.author || 'System',
          action: actionDescription,
          comment: body.comment?.text,
          date: new Date(),
        });

        // Save and get fresh document
        await srd.save();

        // 🔹 FIX: Fetch the document again to ensure all fields are populated correctly
        freshSRD = await SRD.findById(id).lean();

        break; // Success
      } catch (err) {
        if (err.name === 'VersionError' && retries > 1) {
          retries--;
          console.warn(`VersionError updating SRD ${id}, retrying... (${retries} attempts left)`);
          // wait a bit
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms jitter
          continue;
        }
        // If not VersionError or no retries left, throw it
        throw err;
      }
    }

    if (!freshSRD) {
      throw new Error('Failed to update SRD after retries: ' + (freshSRD ? '' : 'No result'));
    }

    // Create notifications for all users
    try {
      const users = await User.find({});
      const notificationMessage = body.status === 'flagged'
        ? `🚩 ${dept.toUpperCase()} flagged an issue in SRD ${freshSRD.refNo}`
        : body.status === 'approved'
          ? `✅ ${dept.toUpperCase()} approved SRD ${freshSRD.refNo}`
          : `📝 ${dept.toUpperCase()} updated SRD ${freshSRD.refNo} to ${body.status}`;

      const notificationPromises = users.map(user =>
        Notification.create({
          user: user._id,
          srd: freshSRD._id, // Updated to use freshSRD
          message: notificationMessage,
          read: false,
        })
      );
      await Promise.all(notificationPromises);
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
    }

    // Trigger Pusher event
    const eventName = body.status === 'flagged' ? 'srd:flag' : 'srd:update';
    await pusher.trigger(`srd-${id}`, eventName, {
      department: dept,
      status: body.status,
      comment: body.comment,
    });

    return NextResponse.json({
      success: true,
      data: freshSRD, // Return the fresh document
      message: `${dept.toUpperCase()} department updated successfully`,
    });
  } catch (error) {
    console.error('Error updating SRD department:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}