import mongoose from 'mongoose';

const PrintTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  gridColumns: {
    type: Number,
    default: 6,
  },
  cells: [{
    fieldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewField',
      required: true,
    },
    position: {
      colSpan: {
        type: Number,
        default: 1,
      },
      height: {
        type: String,
        enum: ['auto', 'small', 'medium', 'large', 'xlarge'],
        default: 'auto',
      },
    },
  }],
  isActive: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default mongoose.models.PrintTemplate || mongoose.model('PrintTemplate', PrintTemplateSchema);