import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import User from '@/models/User';
import Notification from '@/models/Notification';
import pusher from '@/lib/pusher-server';

function normalizeFieldId(fieldId) {
  if (!fieldId) return null;
  if (typeof fieldId === 'object') {
    if (fieldId._id) return fieldId._id.toString();
    if (typeof fieldId.toString === 'function') return fieldId.toString();
    return null;
  }
  return fieldId.toString();
}

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

        // Migrate legacy flat-object status → array format
        if (srd.status && !Array.isArray(srd.status)) {
          const flatStatus = srd.status;
          srd.status = Object.entries(flatStatus).map(([department, value]) => ({
            department,
            value: String(value),
            updatedAt: new Date(),
          }));
        }
        if (!srd.status) srd.status = [];

        // Update status array entry for this department
        const existingEntry = srd.status.find(s => s.department === dept);
        if (existingEntry) {
          existingEntry.value = body.status;
          existingEntry.updatedAt = new Date();
        } else {
          srd.status.push({ department: dept, value: body.status, updatedAt: new Date() });
        }
        srd.markModified('status');

        // Auto-start production when VMD and CAD approve (removed MMC and Commercial requirement)
        const REQUIRED_DEPTS = ['vmd', 'cad']; // Only VMD and CAD needed
        const allApproved = REQUIRED_DEPTS.every(dept =>
          srd.status.find(s => s.department === dept)?.value === 'approved'
        );
        if (allApproved && !srd.inProduction) {
          // Fetch production stages (only IDs needed for linkage + first stage name)
          const ProductionStage = (await import('@/models/ProductionStage')).default;
          const stages = await ProductionStage.find({ isActive: true }).sort({ order: 1 }).select('_id name displayName order').lean();
          if (stages.length > 0) {
            // Ensure SRD has productionStages populated
            if (!srd.productionStages || srd.productionStages.length === 0) {
              srd.productionStages = stages.map(s => s._id);
            }
            srd.readyForProduction = true;
            srd.inProduction = true;
            srd.productionStartDate = new Date();
            srd.currentProductionStage = null; // No stage assigned - first stage must receive manually
            srd.productionProgress = 0;
            if (!srd.productionHistory) srd.productionHistory = [];
            // Don't add any history - waiting for first stage to receive
            const firstStageName = stages[0]?.displayName || stages[0]?.name || 'first stage';
            srd.audit.push({
              action: 'production_auto_started',
              department: 'system',
              author: 'System',
              timestamp: new Date(),
              details: { 
                message: `Production started. Awaiting ${firstStageName} to receive.`,
                trigger: 'vmd_cad_approved' 
              },
            });
          }
        }
        
        // Calculate progress based on approved departments
        const RELEVANT_DEPTS = ['vmd', 'cad', 'commercial', 'mmc'];
        const relevantEntries = srd.status.filter(s => RELEVANT_DEPTS.includes(s.department));
        const approvedCount = relevantEntries.filter(s => s.value === 'approved').length;

        if (relevantEntries.length > 0) {
          srd.progress = Math.round((approvedCount / relevantEntries.length) * 100);
          srd.readyForProduction = approvedCount === relevantEntries.length;
        } else {
          srd.progress = 0;
          srd.readyForProduction = false;
        }

        srd.updatedAt = new Date();

        // Update srd.refNo if a refNo field was changed
        if (body.refNo !== undefined) {
          srd.refNo = body.refNo;
        }

        // Update dynamic fields
        if (body.fields && Array.isArray(body.fields) && body.fields.length > 0) {
          // Update existing dynamicFields array
          body.fields.forEach(updatedField => {
            const updatedFieldId = normalizeFieldId(updatedField.originalFieldId || updatedField.field);
            const existingFieldIndex = srd.dynamicFields.findIndex(
              f => {
                const currentFieldId = normalizeFieldId(f.originalFieldId || f.field);
                return (updatedFieldId && currentFieldId === updatedFieldId) ||
                  (f.name === updatedField.name && f.department === dept);
              }
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
            author: `${body.comment.author}`,
            role: body.comment.role,
            text: body.comment.text,
            date: new Date(),
          });
        }

        // Add audit record with detailed action description
        const actionDescription = body.status === 'flagged'
          ? `Flagged issue in ${dept.toUpperCase()} by ${body.authorName || 'System'}`
          : body.status === 'approved'
            ? `Approved`
            : body.status === 'in-progress'
              ? `Updated to In Progress`
              : `Updated status to ${body.status}`;

        srd.audit.push({
          department: dept,
          author: body.authorName || 'System',
          action: actionDescription,
          role: body.authorRole,
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

    // Create notifications for all users - batch insertMany for speed
    try {
      const users = await User.find({}, '_id');
      const notificationMessage = body.status === 'flagged'
        ? `🚩 ${body.authorName || 'System'} flagged an issue in SRD ${freshSRD.refNo}`
        : body.status === 'approved'
          ? `✅ ${body.authorName || 'System'} approved SRD ${freshSRD.refNo}`
          : `📝 ${body.authorName || 'System'} updated SRD ${freshSRD.refNo} to ${body.status}`;

      const notificationDocs = users.map(user => ({
        user: user._id,
        srd: freshSRD._id,
        message: notificationMessage,
        read: false,
      }));
      await Notification.insertMany(notificationDocs);
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
