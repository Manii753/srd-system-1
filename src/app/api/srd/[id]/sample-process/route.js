import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import User from '@/models/User';
import ProductionStage from '@/models/ProductionStage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const srd = await SRD.findById(id).select('refNo title sampleProcess');
    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: srd });
  } catch (error) {
    console.error('Error fetching sample process:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
// Handles both 'complete' (mark ready) and 'receive' actions.
// CAD is treated as the first production stage (order 0), prepended before the
// ProductionStage documents that live in MongoDB.
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, stage: stageParam, stageId, notes } = body;
    const stage = stageParam || stageId; // accept both field names

    const srd = await SRD.findById(id);
    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    // ── Build the full ordered stage list ──────────────────────────────────
    // CAD is always prepended as order-0.  Physical production stages follow.
    let dbStages = [];
    try {
      const raw = await ProductionStage.find({ isActive: true }).sort({ order: 1 }).select('slug name displayName order').lean();
      dbStages = raw.map(s => ({
        id: s.slug || s.name.toLowerCase(),
        name: s.name,
        displayName: s.displayName || s.name,
        order: s.order,
        _id: s._id,
      }));
    } catch (err) {
      console.error('Error fetching production stages:', err);
      return NextResponse.json({ success: false, error: 'Failed to fetch production stages' }, { status: 500 });
    }

    // Check if CAD is already a DB stage
    const cadInDb = dbStages.some(
      s => s.id === 'cad' || s.name?.toLowerCase() === 'cad'
    );

    // Build the authoritative ordered list with CAD always first
    const cadStage = cadInDb
      ? dbStages.find(s => s.id === 'cad' || s.name?.toLowerCase() === 'cad')
      : { id: 'cad', name: 'cad', displayName: 'CAD', order: 0, _id: null };

    const nonCadStages = cadInDb
      ? dbStages.filter(s => s.id !== 'cad' && s.name?.toLowerCase() !== 'cad')
      : dbStages;

    const productionStages = [cadStage, ...nonCadStages];

    if (productionStages.length <= 1) {
      // Only CAD, no physical stages yet — still valid
    }

    // ── Initialise sampleProcess if empty ─────────────────────────────────
    if (!srd.sampleProcess || srd.sampleProcess.length === 0) {
      const useProductionHistory =
        srd.productionHistory && srd.productionHistory.length > 0;

      // Start with all stages as pending (CAD first)
      const allStages = productionStages.map(ps => ({
        stage: ps.id,
        stageDisplayName: ps.displayName || ps.name,
        status: 'pending',
        order: ps.order,
      }));

      if (useProductionHistory) {
        // Merge existing productionHistory into the new structure
        srd.productionHistory.forEach(historyItem => {
          const stageName =
            historyItem.stage?.slug || historyItem.stageName?.toLowerCase();
          const idx = allStages.findIndex(s => s.stage === stageName);
          if (idx !== -1) {
            allStages[idx] = {
              ...allStages[idx],
              status:
                historyItem.status === 'completed'
                  ? 'completed'
                  : historyItem.status === 'in-progress'
                  ? 'received'
                  : 'pending',
              receivedDate: historyItem.startDate,
              completedDate: historyItem.endDate,
              completedBy: historyItem.completedBy
                ? { name: historyItem.completedBy }
                : null,
              notes: historyItem.notes,
            };
          }
        });
      }

      srd.sampleProcess = allStages;
    } else {
      // Ensure CAD entry exists in an already-initialised sampleProcess
      const hasCadEntry = srd.sampleProcess.some(s => s.stage === 'cad');
      if (!hasCadEntry) {
        srd.sampleProcess.unshift({
          stage: 'cad',
          stageDisplayName: 'CAD',
          status: 'pending',
          order: 0,
        });
        // Re-sort by order
        srd.sampleProcess.sort((a, b) => {
          const aOrder =
            productionStages.find(p => p.id === a.stage)?.order ?? 999;
          const bOrder =
            productionStages.find(p => p.id === b.stage)?.order ?? 999;
          return aOrder - bOrder;
        });
        srd.markModified('sampleProcess');
      }
    }

    // ── Reconcile sampleProcess against the current stage list ─────────────
    // Drop stale entries (e.g. a "dispatch" stage that was deactivated or
    // removed from the ProductionStage collection). Otherwise the tail-based
    // "is this the last stage" check below fails on the last REAL stage and
    // the SRD never becomes Completed.
    const knownStageIds = new Set(productionStages.map(p => p.id));
    const hadStale = srd.sampleProcess.some(e => !knownStageIds.has(e.stage));
    if (hadStale) {
      srd.sampleProcess = srd.sampleProcess.filter(e => knownStageIds.has(e.stage));
      srd.markModified('sampleProcess');
    }

    // ── Find the target stage ──────────────────────────────────────────────
    const stageIndex = srd.sampleProcess.findIndex(s => s.stage === stage);
    if (stageIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Stage "${stage}" not found in sample process` },
        { status: 404 }
      );
    }

    const userRole = session.user.role.toLowerCase();

    // Cross-stage overrides are enforced from the live user record so that
    // revoking them in the Permissions UI takes effect immediately.
    const currentUser = await User.findById(session.user.id)
      .select('role permissions')
      .lean();
    const canReceiveAnyStage = hasPermission(currentUser, 'canReceiveAnyStage');
    const canCompleteAnyStage =
      hasPermission(currentUser, 'canCompleteAnyStage') || canReceiveAnyStage;

    // ── Action: complete (mark Ready) ─────────────────────────────────────
    if (action === 'complete') {
      // Permission: matching role can complete their own stage; admin or a
      // granted cross-stage permission can complete any stage.
      const canComplete =
        userRole === stage || canCompleteAnyStage;

      if (!canComplete) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to complete this stage' },
          { status: 403 }
        );
      }

      if (srd.sampleProcess[stageIndex].completedDate) {
        return NextResponse.json(
          { success: false, error: 'This stage has already been marked as ready/completed' },
          { status: 400 }
        );
      }

      // For CAD (first stage) the SRD must be in production, OR have CAD approval
      if (stageIndex === 0) {
        const cadApproved =
          (srd.status || []).find(s => s.department === 'cad')?.value === 'approved';
        if (!srd.inProduction && !cadApproved) {
          return NextResponse.json(
            {
              success: false,
              error:
                'SRD must be in production (VMD + CAD approved) before CAD can mark it ready.',
            },
            { status: 400 }
          );
        }
        // Auto-start production if not already started but CAD has approved
        if (!srd.inProduction && cadApproved) {
          srd.inProduction = true;
          srd.productionStartDate = new Date();
        }
      } else {
        // Non-first stages: must have been received before marking ready
        if (!srd.sampleProcess[stageIndex].receivedDate) {
          return NextResponse.json(
            {
              success: false,
              error: 'You must receive the sample before marking it as ready.',
            },
            { status: 400 }
          );
        }
      }

      srd.sampleProcess[stageIndex].completedDate = new Date();
      srd.sampleProcess[stageIndex].completedBy = {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
      };
      srd.sampleProcess[stageIndex].status = 'completed';
      if (notes) srd.sampleProcess[stageIndex].notes = notes;

      // Mark next stage as in-progress so the next person knows to receive,
      // but only if the next entry is a real production stage.
      if (stageIndex < srd.sampleProcess.length - 1) {
        const nextStageId = srd.sampleProcess[stageIndex + 1]?.stage;
        if (nextStageId && knownStageIds.has(nextStageId)) {
          srd.sampleProcess[stageIndex + 1].status = 'in-progress';
        }
      }

      // If this was the LAST real stage, mark the SRD as complete immediately.
      // "dispatch" is a workflow stage, not a physical production stage — skip it
      // when determining the real last stage.  Finishing (order 4) is the actual
      // final production stage.
      const realProductionStages = productionStages.filter(
        s => s.id !== 'dispatch' && s.name?.toLowerCase() !== 'dispatch'
      );
      const lastRealStageId = realProductionStages[realProductionStages.length - 1]?.id;
      const isLastStage = lastRealStageId !== undefined && stage === lastRealStageId;
      if (isLastStage) {
        srd.isComplete = true;
        srd.currentProductionStage = null;
        srd.inProduction = false;
        srd.productionEndDate = new Date();
        srd.inDispatch = true;
      }

    // ── Action: receive ───────────────────────────────────────────────────
    } else if (action === 'receive') {
      // The first stage (CAD, index 0) cannot be "received" — it only marks ready
      if (stageIndex === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'The first stage (CAD) cannot be received. Use "Mark Ready" instead.',
          },
          { status: 400 }
        );
      }

      // Must be from the matching department or have the cross-stage permission
      const canReceive = userRole === stage || canReceiveAnyStage;
      if (!canReceive) {
        return NextResponse.json(
          { success: false, error: 'You can only receive samples for your own department' },
          { status: 403 }
        );
      }

      if (srd.sampleProcess[stageIndex].receivedDate) {
        return NextResponse.json(
          { success: false, error: 'This stage has already been received' },
          { status: 400 }
        );
      }

      // Previous stage must be completed (ready) — not just pending
      const prevStage = srd.sampleProcess[stageIndex - 1];
      if (!prevStage.completedDate && prevStage.status === 'pending') {
        return NextResponse.json(
          {
            success: false,
            error: `Previous stage (${prevStage.stageDisplayName || prevStage.stage}) must be marked as Ready before you can receive.`,
          },
          { status: 400 }
        );
      }

      srd.sampleProcess[stageIndex].receivedDate = new Date();
      srd.sampleProcess[stageIndex].receivedBy = {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
      };
      srd.sampleProcess[stageIndex].status = 'received';
      if (notes) srd.sampleProcess[stageIndex].notes = notes;

      // Mark previous stage as completed/handed-over if not already
      if (!prevStage.completedDate) {
        prevStage.completedDate = new Date();
        prevStage.completedBy = {
          id: session.user.id,
          name: session.user.name,
          role: session.user.role,
        };
        prevStage.status = 'completed';
      }
      prevStage.handoverDate = new Date();

    } else {
      return NextResponse.json(
        { success: false, error: `Unknown action "${action}". Use "complete" or "receive".` },
        { status: 400 }
      );
    }

    srd.updatedAt = new Date();
    srd.markModified('sampleProcess');

    // ── Update currentProductionStage ─────────────────────────────────────
    // Point to the first stage that is actively received / in-progress (excluding CAD
    // since it has no ObjectId in ProductionStage collection unless added there).
    // Skip if isComplete was already set above (last stage just completed).
    if (!srd.isComplete) {
      const currentActiveEntry = srd.sampleProcess.find(
        s => s.status === 'received' || s.status === 'in-progress'
      );

      if (currentActiveEntry && currentActiveEntry.stage !== 'cad') {
        const matchingDbStage = dbStages.find(
          ps =>
            ps.id === currentActiveEntry.stage ||
            ps.name?.toLowerCase() === currentActiveEntry.stage
        );
        if (matchingDbStage?._id) {
          srd.currentProductionStage = matchingDbStage._id;
        }
      } else if (!currentActiveEntry) {
        // Check if all REAL production stages are completed (exclude "dispatch"
        // which is a workflow stage, not a physical production stage)
        const allCompleted = srd.sampleProcess
          .filter(s => s.stage !== 'dispatch')
          .every(s => s.status === 'completed');
        if (allCompleted) {
          srd.isComplete = true;
          srd.currentProductionStage = null;
          srd.inDispatch = true;
        }
      }
    }

    await srd.save();

    return NextResponse.json({
      success: true,
      message: `Sample ${action === 'complete' ? 'marked as ready' : 'received'} successfully`,
      data: srd,
    });
  } catch (error) {
    console.error('Error updating sample process:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
