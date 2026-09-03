import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import User from '@/models/User';
import ProductionStage from '@/models/ProductionStage';
import Notification from '@/models/Notification';
import pusher from '@/lib/pusher-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const DEPARTMENT_SLUGS = ['vmd', 'cad', 'commercial', 'mmc'];

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

const getTargetUsers = async (target) => {
  if (!target || !target.trim()) {
    return await User.find({});
  }

  const normalizedTarget = target.trim().toLowerCase();

  if (DEPARTMENT_SLUGS.includes(normalizedTarget)) {
    const users = await User.find({ department: new RegExp(`^${escapeRegExp(normalizedTarget)}$`, 'i') });
    if (users.length > 0) return users;
  }

  const stage = await ProductionStage.findOne({
    $or: [
      { name: new RegExp(`^${escapeRegExp(normalizedTarget)}$`, 'i') },
      { displayName: new RegExp(`^${escapeRegExp(normalizedTarget)}$`, 'i') }
    ]
  }).lean();

  if (stage) {
    const users = await User.find({ 'permissions.stages': normalizedTarget });
    if (users.length > 0) return users;
  }

  return await User.find({});
};

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

  // Handle duplicates — use next incremented SRD number
  // Extract the numeric part from the refNo (e.g. SRD-1011 → 1011)
  const prefix = baseRefNo.replace(/\d+$/, ''); // e.g. "SRD-"
  const lastNum = parseInt(baseRefNo.match(/(\d+)$/)?.[1] || '0', 10);

  // Find the highest existing refNo with this prefix
  const existing = await SRD.find({
    refNo: { $regex: `^${prefix.replace('-', '\\-')}\\d+$` }
  }).select('refNo').lean();

  let maxNum = lastNum;
  for (const doc of existing) {
    const m = doc.refNo.match(/(\d+)$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }

  const newRefNo = `${prefix}${maxNum + 1}`;
  return { refNo: newRefNo, suffix: `(${maxNum + 1})` };
};

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const isRedo = action === 'redo';

    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch (err) {
      requestBody = {};
    }

    const nudgeTarget = requestBody.nudgeTarget?.trim();
    const targetUsers = await getTargetUsers(nudgeTarget);

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
      productionStages,
      currentProductionStage,
      sampleProcess,
      washAnalysisReport,
      inDispatch,
      dispatchDate,
      isComplete,
      comments,
      audit,
      revision,
      images: _legacyImages,
      // Strip all dispatch/conditions fields
      internalApproved,
      internalApprovedBy,
      internalApprovedDate,
      internalRejectedReasons,
      internalEmails,
      sampleDispatchedToBuyer,
      sampleDispatchDate,
      sampleDipatchedtoBuyerDate,
      BuyerApproved,
      BuyerApprovedBy,
      BuyerApprovedDate,
      BuyerRejectedReasons,
      BuyerDetails,
      DispatchDetails,
      ...restOfSrd
    } = originalSrd;
    void _legacyImages;
    void productionStages;
    void currentProductionStage;
    void washAnalysisReport;
    void isComplete;

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

      // Reset progress and status fields to their defaults.
      // NOTE: status must be the canonical ARRAY-of-objects format
      // [{ department, value, updatedAt }] — the same shape used by
      // POST /api/srd, SRDTable, DepartmentPanelExcel and the department
      // PATCH route. A flat object here breaks components that call
      // srd.status.find(...) and causes inconsistent ("same as original")
      // display across the app.
      progress: 0,
      status: ['vmd', 'cad', 'commercial', 'mmc'].map(department => ({
        department,
        value: 'pending',
        updatedAt: new Date(),
      })),
      inProduction: false,
      readyForProduction: false,
      productionProgress: 0,
      productionHistory: [],
      sampleProcess: [],
      washAnalysisReport: null,
      isComplete: false,
      comments: [],
      currentProductionStage: null,
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

    const notificationMessage = nudgeTarget
      ? `📣 ${session.user.name} created a redo for SRD ${newSrd.refNo} and nudged ${nudgeTarget}`
      : `📣 ${session.user.name} created a redo for SRD ${newSrd.refNo}`;

    const notifications = targetUsers.map((user) => ({
      user: user._id,
      srd: newSrd._id,
      action: isRedo ? 'redo' : 'duplicate',
      targetDepartment: DEPARTMENT_SLUGS.includes(nudgeTarget?.toLowerCase?.() ?? '') ? nudgeTarget : undefined,
      targetProductionStage: !DEPARTMENT_SLUGS.includes(nudgeTarget?.toLowerCase?.() ?? '') ? nudgeTarget : undefined,
      message: notificationMessage,
      read: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    try {
      if (process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET) {
        await pusher.trigger('srd-events', 'srd:new', {
          refNo: newSrd.refNo,
          _id: newSrd._id,
          action: 'redo'
        });
      }
    } catch (pusherError) {
      console.warn('Pusher trigger failed for redo event:', pusherError.message);
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
