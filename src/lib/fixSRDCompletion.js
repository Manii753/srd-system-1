import mongoose from 'mongoose';
import SRD from '../models/SRD.js';
import ProductionStage from '../models/ProductionStage.js';
import dotenv from 'dotenv';

// Heals SRDs that are stuck "in production" / show the last stage (e.g.
// Finishing) as current even though every real production stage is done.
//
// Root cause: the SRD's sampleProcess array contains a stale stage (e.g.
// "dispatch", order 5) that is no longer an active ProductionStage. Because
// the completion logic used the sampleProcess tail to detect the last stage,
// the last REAL stage (Finishing) was never treated as final, so isComplete /
// inProduction were never updated and reports/inter-dept log kept showing the
// SRD as still in production.
//
// Rules (idempotent, safe):
//   1. Build the authoritative active-stage set from the ProductionStage
//      collection (plus the virtual CAD entry that sample-process prepends).
//   2. Drop sampleProcess entries not in that authoritative set.
//   3. If every remaining entry is completed, mark the SRD complete:
//        isComplete = true, inProduction = false, currentProductionStage = null,
//        productionEndDate (if missing), inDispatch = true.
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const dbStages = await ProductionStage.find({ isActive: true }).sort({ order: 1 }).lean();
  const knownStageIds = new Set();
  knownStageIds.add('cad'); // virtual stage always prepended by sample-process
  dbStages.forEach(s => knownStageIds.add(String(s.slug || s.name).toLowerCase()));

  console.log('Authoritative active stages:');
  [...knownStageIds].forEach(id => console.log(`  - ${id}`));
  console.log('');

  const srds = await SRD.find({
    $or: [
      { inProduction: true },
      { isComplete: false },
      { 'sampleProcess.0': { $exists: true } },
    ],
  });

  let pruned = 0;
  let completed = 0;
  const details = [];

  for (const srd of srds) {
    const before = (srd.sampleProcess || []).slice().map(s => s.stage);

    // ── Rule 2: drop stale entries ──────────────────────────────────────
    const clean = (srd.sampleProcess || []).filter(s => knownStageIds.has(String(s.stage || '').toLowerCase()));
    if (clean.length !== (srd.sampleProcess || []).length) {
      srd.sampleProcess = clean;
      srd.markModified('sampleProcess');
      pruned++;
    }

    // ── Rule 2b: CAD approved at dept level counts as completed ──────────
    // Older SRDs that entered production via the VMD+CAD approval path have a
    // 'cad' sampleProcess entry left 'pending' even though the CAD department
    // already approved (department status value 'approved'). The inter-dept
    // UI already treats dept CAD approval as the CAD stage being done, so
    // mirror that here so these records can be finalized.
    const cadEntry = (srd.sampleProcess || []).find(s => String(s.stage || '').toLowerCase() === 'cad');
    const cadDeptApproved = Array.isArray(srd.status) &&
      (srd.status.find(st => st.department === 'cad') || {}).value === 'approved';
    if (cadEntry && !cadEntry.completedDate && cadDeptApproved) {
      if (cadEntry.status !== 'completed') cadEntry.status = 'completed';
      if (!cadEntry.completedDate) cadEntry.completedDate = new Date();
      srd.markModified('sampleProcess');
    }

    // ── Rule 3: finalize completion if all real stages are done ─────────
    const allDone =
      (srd.sampleProcess || []).length > 0 &&
      (srd.sampleProcess || []).every(s => s.status === 'completed' || !!s.completedDate);

    if (allDone && (!srd.isComplete || srd.inProduction || srd.currentProductionStage)) {
      srd.isComplete = true;
      srd.inProduction = false;
      srd.currentProductionStage = null;
      if (!srd.productionEndDate) srd.productionEndDate = new Date();
      srd.inDispatch = true;
      completed++;
      details.push(`[${srd.refNo}] sampleProcess ${before.join('>')} -> done`);
    } else if (clean.length !== (srd.sampleProcess || []).length) {
      details.push(`[${srd.refNo}] pruned stale stages (${before.join(',')})`);
    }

    if (srd.isModified() || srd.isModified('sampleProcess')) {
      srd.updatedAt = new Date();
      await srd.save();
    }
  }

  console.log(`Pruned stale sampleProcess stages on ${pruned} SRD(s)`);
  console.log(`Marked ${completed} SRD(s) as complete\n`);
  if (details.length) {
    console.log('Details:');
    details.forEach(d => console.log(`  ${d}`));
  }

  // Verify
  const stillStuck = await SRD.countDocuments({
    inProduction: true,
    isComplete: { $ne: true },
    'sampleProcess.0': { $exists: true },
  });
  console.log(`\nRemaining stuck SRDs (inProduction, not complete): ${stillStuck}`);

  await mongoose.disconnect();
}

run().catch(err => { console.error('Error:', err); process.exit(1); });