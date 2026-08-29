import mongoose from 'mongoose';
import SRD from '../models/SRD.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Repairs SRDs whose `status` field is stored in the legacy flat-object shape
// (e.g. { vmd: 'pending', cad: 'approved' }) or a Map, converting them to the
// canonical array-of-objects shape used by the schema and the rest of the app:
//   [{ department, value, updatedAt }]
// The duplicate/redo route previously wrote flat objects, which made redo/
// duplicate SRDs appear to keep the original's status and broke components
// that call srd.status.find(...).
//
// It ALSO resets production/sample-process tracking on SRDs created as a
// duplicate or redo (identified by their audit entry). The old duplicate/redo
// code copied productionHistory / sampleProcess / inProduction / etc. from the
// original, so redo/duplicate SRs incorrectly kept showing "In Progress" and old
// stage dates. A duplicate/redo should be a fresh SR with prefilled fields.
async function fixSRDStatusFormat() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const srds = await SRD.find({});
    console.log(`Found ${srds.length} SRDs to check\n`);

    let fixed = 0;
    let resetProduction = 0;

    for (const srd of srds) {
      const status = srd.status;

      // ── PART 1: normalise the status field ──
      let statusChanged = false;

      // Already canonical array — ensure the four approval departments exist
      if (Array.isArray(status)) {
        for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
          const entry = status.find(s => s && s.department === dept);
          if (!entry) {
            status.push({ department: dept, value: 'pending', updatedAt: new Date() });
            statusChanged = true;
          }
        }
      } else if (status && typeof status === 'object') {
        // Legacy flat object or Map → convert to array
        const entries = [];
        for (const [department, value] of Object.entries(status)) {
          if (value === undefined || value === null) continue;
          entries.push({ department, value: String(value), updatedAt: new Date() });
        }
        for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
          if (!entries.some(e => e.department === dept)) {
            entries.push({ department: dept, value: 'pending', updatedAt: new Date() });
          }
        }
        srd.status = entries;
        statusChanged = true;
      } else if (!status) {
        // No status at all → seed with fresh pending array
        srd.status = ['vmd', 'cad', 'commercial', 'mmc'].map(department => ({
          department,
          value: 'pending',
          updatedAt: new Date(),
        }));
        statusChanged = true;
      }

      if (statusChanged) {
        srd.markModified('status');
        await srd.save();
        fixed++;
        console.log(`  Normalised status for SRD ${srd.refNo}`);
      }

      // ── PART 2: reset production / sample-process on redo/duplicate SRDs ──
      const isDupeOrRedo = (srd.audit || []).some(e =>
        e?.action === 'duplicate' || e?.action === 'redo'
      );
      if (isDupeOrRedo) {
        const hasLeftoverProduction =
          srd.inProduction ||
          srd.readyForProduction ||
          (Array.isArray(srd.productionHistory) && srd.productionHistory.length > 0) ||
          (Array.isArray(srd.sampleProcess) && srd.sampleProcess.length > 0) ||
          srd.currentProductionStage ||
          srd.productionProgress > 0 ||
          srd.isComplete;

        if (hasLeftoverProduction) {
          srd.inProduction = false;
          srd.readyForProduction = false;
          srd.productionProgress = 0;
          srd.productionHistory = [];
          srd.sampleProcess = [];
          srd.currentProductionStage = null;
          srd.productionStartDate = null;
          srd.productionEndDate = null;
          srd.progress = 0;
          srd.isComplete = false;
          srd.markModified('status');
          srd.markModified('productionHistory');
          srd.markModified('sampleProcess');
          await srd.save();
          resetProduction++;
          console.log(`  Reset production/sample tracking for redo/duplicate SRD ${srd.refNo}`);
        }
      }
    }

    console.log(`\nFixed ${fixed} SRD status field(s), reset production on ${resetProduction} redo/duplicate SRD(s)`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error fixing SRD status format:', error);
    process.exit(1);
  }
}

fixSRDStatusFormat();
