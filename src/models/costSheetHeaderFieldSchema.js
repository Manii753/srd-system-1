import mongoose from 'mongoose';

// Header field definition used by templates and snapshotted into sheets.
// type: 'text' | 'select' — when 'select', options are shown as a dropdown.
const costSheetHeaderFieldSchema = new mongoose.Schema(
  {
    key: { type: String, default: '' }, // stable id used to store the value
    label: { type: String, default: '' },
    type: { type: String, enum: ['text', 'select'], default: 'text' },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

export default costSheetHeaderFieldSchema;