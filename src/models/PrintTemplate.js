import mongoose from 'mongoose';

const PrintTemplateCellSchema = new mongoose.Schema({
  // For database fields - reference to Field model
  // NOT required because custom elements don't have a fieldId
  fieldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Field',
    required: false,  // Changed from default behavior
    default: null,
  },
  
  // Custom element properties
  isCustom: {
    type: Boolean,
    default: false,
  },
  customType: {
    type: String,
    enum: [
      'custom-heading',
      'custom-text', 
      'custom-empty-field',
      'custom-textarea',
      'custom-table',
      'custom-separator',
      'custom-signature',
      null
    ],
    default: null,
  },
  customValue: {
    type: String,
    default: null,
  },
  customPlaceholder: {
    type: String,
    default: null,
  },
  
  // Position and sizing
  position: {
    colSpan: {
      type: Number,
      default: 1,
      min: 0.5,
      max: 12,
    },
    rowSpan: {
      type: Number,
      default: 1,
      min: 1,
      max: 12,
    },
    height: {
      type: String,
      enum: ['auto', 'small', 'medium', 'large', 'xlarge'],
      default: 'auto',
    },
  },
}, { _id: false }); // Disable _id for subdocuments to keep it cleaner

// Custom validation: either fieldId OR isCustom must be set
PrintTemplateCellSchema.pre('validate', function(next) {
  if (!this.isCustom && !this.fieldId) {
    // If it's not a custom element, fieldId is required
    this.invalidate('fieldId', 'fieldId is required for non-custom elements');
  }
  if (this.isCustom && !this.customType) {
    // If it's a custom element, customType is required
    this.invalidate('customType', 'customType is required for custom elements');
  }
  next();
});

const PrintTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  gridColumns: {
    type: Number,
    default: 6,
    min: 1,
    max: 12,
  },
  theme: {
    type: String,
    enum: ['default', 'modern', 'professional', 'minimal'],
    default: 'default',
  },
  cells: [PrintTemplateCellSchema],
  isActive: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for faster queries
PrintTemplateSchema.index({ isActive: 1 });
PrintTemplateSchema.index({ createdAt: -1 });

// Virtual to get cell count
PrintTemplateSchema.virtual('cellCount').get(function() {
  return this.cells?.length || 0;
});

// Virtual to get custom element count
PrintTemplateSchema.virtual('customElementCount').get(function() {
  return this.cells?.filter(c => c.isCustom).length || 0;
});

// Ensure virtuals are included in JSON output
PrintTemplateSchema.set('toJSON', { virtuals: true });
PrintTemplateSchema.set('toObject', { virtuals: true });

// Delete existing model to allow schema changes (useful in development)
if (mongoose.models.PrintTemplate) {
  delete mongoose.models.PrintTemplate;
}

export default mongoose.model('PrintTemplate', PrintTemplateSchema);