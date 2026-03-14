import mongoose from 'mongoose';

const ReportTemplateStateSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  hasSeeded: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

if (mongoose.models.ReportTemplateState) {
  delete mongoose.models.ReportTemplateState;
}

export default mongoose.model('ReportTemplateState', ReportTemplateStateSchema);
