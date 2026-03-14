import mongoose from 'mongoose';

const ReportTemplateColumnSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['field', 'computed'],
    required: true,
  },
  fieldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Field',
    default: null,
  },
  computedKey: {
    type: String,
    enum: [
      'currentProductionStage',
      'currentProductionStageStartDate',
      'productionStageStartDate',
      'productionStageEndDate',
      null,
    ],
    default: null,
  },
  stageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionStage',
    default: null,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const ReportTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  columns: {
    type: [ReportTemplateColumnSchema],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

ReportTemplateSchema.index({ isActive: 1 });
ReportTemplateSchema.index({ createdAt: -1 });

if (mongoose.models.ReportTemplate) {
  delete mongoose.models.ReportTemplate;
}

export default mongoose.model('ReportTemplate', ReportTemplateSchema);
