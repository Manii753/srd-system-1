import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Department from '@/models/Department';
import ProductionStage from '@/models/ProductionStage';

const REQUIRED_DEPTS = ['vmd', 'cad', 'commercial', 'mmc'];
const EXCLUDED_ROLES = ['admin', 'production-manager'];

async function diagnoseOne(srd, validDepts, stages) {
  const issues = [];
  const statusArray = srd.status || [];

  // 1. Invalid roles in status
  for (const role of EXCLUDED_ROLES) {
    if (statusArray.some(s => s.department === role)) {
      issues.push({ type: 'invalid_role', fix: 'remove_role', data: { role }, label: `"${role}" should not be in approval workflow` });
    }
  }

  // 2. Missing departments
  for (const dept of validDepts) {
    if (!statusArray.some(s => s.department === dept.slug)) {
      issues.push({ type: 'missing_dept', fix: 'add_dept', data: { slug: dept.slug }, label: `Department "${dept.slug}" missing from status` });
    }
  }

  // 3. Wrong readyForProduction flag
  const approvedCount = REQUIRED_DEPTS.filter(d =>
    statusArray.find(s => s.department === d)?.value === 'approved'
  ).length;
  const shouldBeReady = approvedCount === REQUIRED_DEPTS.length;

  if (shouldBeReady && !srd.readyForProduction) {
    issues.push({ type: 'wrong_ready_flag', fix: 'set_ready', data: {}, label: 'All depts approved but readyForProduction = false' });
  }
  if (!shouldBeReady && srd.readyForProduction && !srd.inProduction) {
    issues.push({ type: 'premature_ready_flag', fix: 'clear_ready', data: {}, label: 'readyForProduction = true but not all depts approved' });
  }

  // 4. Wrong progress
  const expectedProgress = validDepts.length > 0
    ? Math.round((REQUIRED_DEPTS.filter(d => statusArray.find(s => s.department === d)?.value === 'approved').length / REQUIRED_DEPTS.length) * 100)
    : 0;
  if (expectedProgress !== srd.progress) {
    issues.push({ type: 'wrong_progress', fix: 'recalc_progress', data: { expected: expectedProgress, actual: srd.progress }, label: `Progress is ${srd.progress}% but should be ${expectedProgress}%` });
  }

  // 5. Should be in production but isn't
  if (shouldBeReady && !srd.inProduction && stages.length > 0) {
    issues.push({ type: 'not_in_production', fix: 'start_production', data: {}, label: 'All depts approved but not in production' });
  }

  // 6. inProduction=true but no currentProductionStage
  if (srd.inProduction && !srd.currentProductionStage) {
    issues.push({ type: 'missing_stage', fix: 'assign_stage', data: {}, label: 'In production but no current stage assigned' });
  }

  // 7. All real production stages completed but inDispatch / isComplete not set
  //    (root cause: "dispatch" was a production stage, so finishing was never the "last")
  const knownStageSlugs = new Set(['cad', ...(stages || []).map(s => (s.slug || s.name || '').toLowerCase())]);
  const realEntries = (srd.sampleProcess || []).filter(e => knownStageSlugs.has((e.stage || '').toLowerCase()) && e.stage !== 'dispatch');
  const allRealStagesDone = realEntries.length > 0 && realEntries.every(e => e.status === 'completed' || e.completedDate);
  if (allRealStagesDone && !srd.inDispatch) {
    issues.push({ type: 'not_in_dispatch', fix: 'fix_dispatch', data: {}, label: 'All production stages completed but inDispatch is false — dispatch form locked' });
  }

  // 8. Stale sampleProcess entries (e.g. "dispatch" stage that's no longer active)
  const staleEntries = (srd.sampleProcess || []).filter(e => !knownStageSlugs.has((e.stage || '').toLowerCase()));
  if (staleEntries.length > 0) {
    issues.push({ type: 'stale_stages', fix: 'prune_stale_stages', data: { stale: staleEntries.map(e => e.stage) }, label: `Stale sampleProcess stages: ${staleEntries.map(e => e.stage).join(', ')}` });
  }

  return issues;
}

// GET — scan all SRDs
export async function GET() {
  await dbConnect();
  try {
    const [srds, allDepts, stages] = await Promise.all([
      SRD.find({}).lean(),
      Department.find({}).lean(),
      ProductionStage.find({ isActive: true }).sort({ order: 1 }).lean(),
    ]);

    const validDepts = allDepts.filter(d => !EXCLUDED_ROLES.includes(d.slug));
    const results = [];

    for (const srd of srds) {
      const issues = await diagnoseOne(srd, validDepts, stages);
      if (issues.length > 0) {
        results.push({
          _id: srd._id,
          refNo: srd.refNo,
          progress: srd.progress,
          readyForProduction: srd.readyForProduction,
          inProduction: srd.inProduction,
          inDispatch: srd.inDispatch,
          isComplete: srd.isComplete,
          issues,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: srds.length,
        withIssues: results.length,
        healthy: srds.length - results.length,
        results,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — fix all (or specific IDs)
export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json().catch(() => ({}));
    const targetIds = body.ids; // optional: fix only these IDs

    const [srds, allDepts, stages] = await Promise.all([
      targetIds?.length
        ? SRD.find({ _id: { $in: targetIds } })
        : SRD.find({}),
      Department.find({}).lean(),
      ProductionStage.find({ isActive: true }).sort({ order: 1 }).lean(),
    ]);

    const validDepts = allDepts.filter(d => !EXCLUDED_ROLES.includes(d.slug));
    const firstStage = stages[0] || null;
    const fixed = [];

    for (const srd of srds) {
      const issues = await diagnoseOne(srd, validDepts, stages);
      if (issues.length === 0) continue;

      const changes = [];
      if (!srd.status) srd.status = [];

      for (const issue of issues) {
        switch (issue.fix) {
          case 'remove_role': {
            const idx = srd.status.findIndex(s => s.department === issue.data.role);
            if (idx !== -1) { srd.status.splice(idx, 1); changes.push(issue.label); }
            break;
          }
          case 'add_dept': {
            srd.status.push({ department: issue.data.slug, value: 'pending', updatedAt: new Date() });
            changes.push(issue.label);
            break;
          }
          case 'set_ready': {
            srd.readyForProduction = true;
            changes.push(issue.label);
            break;
          }
          case 'clear_ready': {
            srd.readyForProduction = false;
            changes.push(issue.label);
            break;
          }
          case 'recalc_progress': {
            srd.progress = issue.data.expected;
            changes.push(`Progress corrected to ${issue.data.expected}%`);
            break;
          }
          case 'start_production': {
            if (firstStage) {
              srd.readyForProduction = true;
              srd.inProduction = true;
              srd.productionStartDate = srd.productionStartDate || new Date();
              srd.currentProductionStage = firstStage._id;
              srd.productionProgress = srd.productionProgress || 0;
              if (!srd.productionHistory?.length) {
                srd.productionHistory = [{
                  stage: firstStage._id,
                  stageName: firstStage.name,
                  stageDisplayName: firstStage.displayName || firstStage.name,
                  startDate: new Date(),
                  status: 'in-progress',
                }];
              }
              if (!srd.productionStages?.length) {
                srd.productionStages = stages.map(s => s._id);
              }
              changes.push(`Started production at ${firstStage.displayName || firstStage.name}`);
            }
            break;
          }
          case 'assign_stage': {
            if (firstStage) {
              srd.currentProductionStage = firstStage._id;
              changes.push(`Assigned to stage ${firstStage.displayName || firstStage.name}`);
            }
            break;
          }
          case 'fix_dispatch': {
            srd.inDispatch = true;
            srd.isComplete = true;
            srd.inProduction = false;
            srd.currentProductionStage = null;
            if (!srd.productionEndDate) srd.productionEndDate = new Date();
            changes.push('Set inDispatch=true, isComplete=true');
            break;
          }
          case 'prune_stale_stages': {
            const known = new Set(['cad', ...stages.map(s => (s.slug || s.name || '').toLowerCase())]);
            srd.sampleProcess = (srd.sampleProcess || []).filter(e => known.has((e.stage || '').toLowerCase()));
            srd.markModified('sampleProcess');
            changes.push(`Pruned stale stages: ${issue.data.stale.join(', ')}`);
            break;
          }
        }
      }

      if (changes.length > 0) {
        srd.markModified('status');
        srd.updatedAt = new Date();
        await srd.save();
        fixed.push({ refNo: srd.refNo, changes });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed.length} SRD(s)`,
      data: { fixed },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
