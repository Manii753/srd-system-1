import mongoose from 'mongoose';

const ReportGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brands: [{ type: String, trim: true }],
  assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  color: { type: String, default: '#2d6a2d' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.ReportGroup || mongoose.model('ReportGroup', ReportGroupSchema);
