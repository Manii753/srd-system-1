import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  // Message type: 'direct' for DMs, 'department' for group messages
  type: {
    type: String,
    enum: ['direct', 'department'],
    required: true,
  },
  
  // For direct messages
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // For direct messages
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // For department messages (group chat)
  department: {
    type: String,
  },
  
  // Message content
  subject: {
    type: String,
  },
  
  content: {
    type: String,
    required: true,
  },
  
  // Optional SRD reference
  srd: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SRD',
  },
  
  // Read status for each recipient
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Attachments (for voice messages, files, etc.)
  attachments: [{
    type: {
      type: String,
      default: 'audio'
    },
    url: String,
    mimeType: String,
    size: Number,
  }],
  
  // Voice message flag
  isVoice: {
    type: Boolean,
    default: false,
  },
  
  // Transcription of voice message
  transcription: {
    type: String,
  },
  
  // Language of transcription
  transcriptionLanguage: {
    type: String,
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ department: 1, createdAt: -1 });
messageSchema.index({ type: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, sender: 1 });
messageSchema.index({ 'readBy.user': 1 });

// Delete the model if it exists to ensure schema updates are applied
if (mongoose.models.Message) {
  delete mongoose.models.Message;
}

export default mongoose.model('Message', messageSchema);
