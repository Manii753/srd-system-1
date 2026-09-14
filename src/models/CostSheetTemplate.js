import mongoose from 'mongoose';
import costSheetColumnSchema from './costSheetColumnSchema';

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    columns: { type: [costSheetColumnSchema], default: [] },
    defaultRows: { type: Number, default: 5 },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.CostSheetTemplate ||
  mongoose.model('CostSheetTemplate', templateSchema);