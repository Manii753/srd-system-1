import mongoose from 'mongoose';
import costSheetColumnSchema from './costSheetColumnSchema';

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    columns: { type: [costSheetColumnSchema], default: [] },
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