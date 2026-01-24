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
      rowSpan: {
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

// Force model recompilation if it exists to ensure schema updates (like rowSpan) are applied
if (mongoose.models.PrintTemplate) {
  delete mongoose.models.PrintTemplate;
}

export default mongoose.model('PrintTemplate', PrintTemplateSchema);