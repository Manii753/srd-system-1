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

// Performance indexes: notification list + unread queries are the hottest
notificationSchema.index({ user: 1, timestamp: -1 });   // user's notification feed
notificationSchema.index({ user: 1, read: 1 });          // unread badge queries
notificationSchema.index({ srd: 1 });                    // mark-read by SRD

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
