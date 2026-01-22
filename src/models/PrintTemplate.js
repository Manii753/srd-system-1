import mongoose from 'mongoose';

const PrintTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
    enum: ['vmd', 'cad', 'commercial', 'mmc'],
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
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.PrintTemplate || mongoose.model('PrintTemplate', PrintTemplateSchema);