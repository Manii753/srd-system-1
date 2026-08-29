import mongoose from 'mongoose';
import SRD from '../models/SRD.js';
import ProductionStage from '../models/ProductionStage.js';
import dotenv from 'dotenv';

// Reconciles inconsistent production/sample tracking on SRDs.
//
// Problem being solved: some SRDs show contradictory state, e.g.
//   - TWO stages shown "In Progress" at the same time, because a sampleProcess
//     entry was left `status: 'in-progress'` even though it already has a
//     completedDate, while ANOTHER stage was marked 'in-progress' with no
//     received/completed date at all (never actually started).
//   - The row Status cell says an early stage (e.g. "Sewing") because
//     `currentProductionStage` points at that stage, even though the real
//     tracking moved further (and `productionHistory` is empty).
//
// Rules (idempotent, safe):
//   1. sampleProcess: for any entry with status 'in-progress':
//        - if it has a completedDate        -> set status 'completed'
//        - else if it has no receivedDate   -> set status 'pending'
//   2. currentProductionStage (ONLY when productionHistory is empty, i.e. the
//      sampleProcess pipeline is the real tracker): point it at the first stage
//      (by order) that is still active ('in-progress'/'received') after rule 1.
//      If no stage is active, set it to null so the Status no longer shows a
//      stale/early stage name.
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const stages = await ProductionStage.find({}).lean();
  const slugToId = new Map(stages.map(s => [(s.slug || s.name || '').toLowerCase(), s._id]));
  // Also index by plain name and displayName (lowercased) for robustness
  for (const s of stages) {
    slugToId.set(String(s.name || '').toLowerCase(), s._id);
    slugToId.set(String(s.displayName || '').toLowerCase(), s._id);
  }

  const srds = await SRD.find({});
  let fixedSample = 0;
  let fixedStage = 0;

  for (const srd of srds) {
    let sampleChanged = false;

    // ── Rule 1: reconcile sampleProcess statuses ──
    for (const entry of srd.sampleProcess || []) {
      if (entry.status !== 'in-progress') continue;

      if (entry.completedDate) {
        entry.status = 'completed';
        sampleChanged = true;
        console.log(`  [${srd.refNo}] sampleProcess '${entry.stage}' had completedDate but was 'in-progress' -> completed`);
      } else if (!entry.receivedDate) {
        entry.status = 'pending';
        sampleChanged = true;
        console.log(`  [${srd.refNo}] sampleProcess '${entry.stage}' was 'in-progress' with no dates -> pending`);
      }
    }

    // Also catch 'received' entries that have a completedDate (done but not marked complete)
    for (const entry of srd.sampleProcess || []) {
      if (entry.status === 'received' && entry.completedDate) {
        entry.status = 'completed';
        sampleChanged = true;
        console.log(`  [${srd.refNo}] sampleProcess '${entry.stage}' was 'received' but completedDate present -> completed`);
      }
    }

    if (sampleChanged) {
      srd.markModified('sampleProcess');
    }

    // ── Rule 2: reconcile currentProductionStage ──
    const hasRealProductionHistory = (srd.productionHistory || []).length > 0;
    if (!hasRealProductionHistory && srd.inProduction && (srd.sampleProcess || []).length > 0) {
      // Find the first active stage (in-progress/received) in stage order
      const activeSample = (srd.sampleProcess || []).find(s => s.status === 'in-progress' || s.status === 'received');
      const desiredStageId = activeSample
        ? slugToId.get(String(activeSample.stage || '').toLowerCase())
        : null;

      const currentStr = srd.currentProductionStage ? String(srd.currentProductionStage) : null;
      const desiredStr = desiredStageId ? String(desiredStageId) : null;

      if (currentStr !== desiredStr) {
        srd.currentProductionStage = desiredStageId;
        srd.markModified('currentProductionStage');
        fixedStage++;
        console.log(
          `  [${srd.refNo}] currentProductionStage -> ${activeSample
            ? `active stage '${activeSample.stage}' (${desiredStr})`
            : 'null (no active stage)'}`
        );
      }
    }

    if (sampleChanged || srd.isModified('currentProductionStage')) {
      await srd.save();
      if (sampleChanged) fixedSample++;
    }
  }

  console.log(`\nFixed sampleProcess on ${fixedSample} SRD(s), currentProductionStage on ${fixedStage} SRD(s)`);
  await mongoose.disconnect();
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
