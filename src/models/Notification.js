import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  srd: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SRD',
  },
  action: {
    type: String,
    default: 'info',
  },
  targetDepartment: String,
  targetProductionStage: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
