import mongoose from 'mongoose';

const productionStageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: String,
  color: {
    type: String,
    default: '#3b82f6'
  },
  icon: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  duration : {
    type: Number, // Duration in hours
    default: 0
  }
});

export default mongoose.models.ProductionStage || mongoose.model('ProductionStage', productionStageSchema);
