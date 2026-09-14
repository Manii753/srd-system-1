import mongoose from 'mongoose';
import costSheetColumnSchema from './costSheetColumnSchema';
import costSheetHeaderFieldSchema from './costSheetHeaderFieldSchema';

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    columns: { type: [costSheetColumnSchema], default: [] },
    // Key-value header fields shown above the grid (Date, Brand, Fit Code…).
    headerFields: { type: [costSheetHeaderFieldSchema], default: [] },
    // Column whose values are summed per section and shown as the running total.
    subtotalColumnKey: { type: String, default: '' },
    defaultRows: { type: Number, default: 5 },
    // Starting structure for new sheets: array of rows where section rows are
    // { type:'section', title } and data rows are { type:'data' }.
    skeleton: { type: mongoose.Schema.Types.Mixed, default: [] },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.CostSheetTemplate ||
  mongoose.model('CostSheetTemplate', templateSchema);