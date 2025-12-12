import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  department: String,
  author: String,
  role: String,
  text: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const auditSchema = new mongoose.Schema({
  action: String,
  department: String,
  author: String,
  timestamp: { type: Date, default: Date.now },
  details: Object
});


const srdSchema = new mongoose.Schema({
  refNo: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  
  createdBy: { 
    id: String, 
    name: String, 
    role: String 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  progress: { type: Number, default: 0, min: 0, max: 100 },
  readyForProduction: { type: Boolean, default: false },
  inProduction: { type: Boolean, default: false },
  
  // Production tracking
  productionStartDate: { type: Date },
  productionEndDate: { type: Date },
  currentProductionStage: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ProductionStage' 
  },
  productionProgress: { type: Number, default: 0, min: 0, max: 100 },
  productionHistory: [{
    stage: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionStage' },
    stageName: String,
    stageDisplayName: String,
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    completedBy: String,
    notes: String,
    status: { 
      type: String, 
      enum: ['in-progress', 'completed', 'on-hold', 'issue'],
      default: 'in-progress'
    }
  }],
  
  status: {
    type: Object,
    of: String,
    default: {}
  },

  // Images (optional)
  images: [String],

  dynamicFields: [{
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field' },
    department: { type: String },
    name: { type: String },
    slug: { type: String },
    type: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
    isRequired: { type: Boolean, default: false }
  }],
  
  comments: [commentSchema],
  audit: [auditSchema]
});

export default mongoose.models.SRD || mongoose.model('SRD', srdSchema);