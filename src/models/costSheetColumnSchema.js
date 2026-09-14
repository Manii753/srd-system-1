import mongoose from 'mongoose';

// Column definition used by both templates and sheet documents (snapshotted).
const costSheetColumnSchema = new mongoose.Schema(
  {
    key: { type: String, default: '' }, // Excel letter e.g. 'A', 'B'...
    label: { type: String, default: '' },
    type: { type: String, enum: ['text', 'number', 'formula'], default: 'text' },
    formula: { type: String, default: '' }, // used when type === 'formula'
    width: { type: Number, default: 120 },
  },
  { _id: false }
);

export default costSheetColumnSchema;