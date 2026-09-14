import mongoose from 'mongoose';
import costSheetColumnSchema from './costSheetColumnSchema';

const sheetSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostSheetTemplate',
      default: null,
    },
    templateName: { type: String, default: '' },
    // Linked SRD (optional). Standalone when absent.
    srd: { type: mongoose.Schema.Types.ObjectId, ref: 'SRD', default: null },
    srdRefNo: { type: String, default: '' },
    standalone: { type: Boolean, default: true },
    // Snapshot of the template's columns so the sheet stays stable over time.
    columns: { type: [costSheetColumnSchema], default: [] },
    // Spreadsheet data: one object per row, keyed by column key e.g. { A: '10', B: '0.5' }
    rows: { type: mongoose.Schema.Types.Mixed, default: [] },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

sheetSchema.index({ srd: 1 });

export default mongoose.models.CostSheet ||
  mongoose.model('CostSheet', sheetSchema);