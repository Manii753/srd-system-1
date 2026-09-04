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
  role: String,
  timestamp: { type: Date, default: Date.now },
  details: Object
});


const srdSchema = new mongoose.Schema({
  refNo: { type: String, required: true, unique: true },
  title: { type: String },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintTemplate' },
  description: String,
  isComplete: { type: Boolean, default: false },

  revision: { type: Number, default: 0 },

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
  
  productionStages : {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductionStage' }],
    default: []
  },
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

  inDispatch: { type: Boolean, default: false },
  dispatchDate: { type: Date },
  internalApproved: { type: Boolean, default: false },
  internalRejectedReasons: [{
    department: String,
    reason: String,
  }],
  internalApprovedBy: { type: String },
  internalApprovedDate: { type: Date },
  internalComments: { type: String },
  internalCommentImages: [{ type: String }],
  internalEmails: [String],
  sampleDispatchedToBuyer: { type: Boolean, default: false },
  sampleDipatchedtoBuyerDate: { type: Date },

  BuyerApproved: { type: Boolean, default: false },
  BuyerRejectedReasons: [{
    department: String,
    reason: String,
  }],
  BuyerApprovedBy: { type: String },
  BuyerComments: { type: String },
  BuyerCommentImages: [{ type: String }],
  BuyerApprovedDate: { type: Date },
  BuyerDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer' },
  DispatchDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch' },

  // Sample Process Tracking
  sampleProcess: [{
    stage: {
      type: String,
      required: true
    },
    stageDisplayName: String,
    completedDate: Date,
    completedBy: {
      id: String,
      name: String,
      role: String
    },
    handoverDate: Date, // When this stage handed over to next stage
    receivedDate: Date,
    receivedBy: {
      id: String,
      name: String,
      role: String
    },
    nextStage: String,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'received'],
      default: 'pending'
    },
    notes: String,
    order: Number
  }],

  status:[{
    department: String,
    value: { type: String, enum: ['approved', 'rejected', 'flagged','in-progress', 'pending'], default: 'pending' },
    updatedAt: { type: Date, default: Date.now }
  }],

  // Wash Analysis Report (single Excel file with before & after wash data)
  washAnalysisReport: {
    url: { type: String, default: null },
    name: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
    uploadedBy: { type: String, default: null },
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
    isRequired: { type: Boolean, default: false },
    requirementLevel: { type: String, enum: ['none', 'required', 'compulsory'], default: 'none' },
    isOptional: { type: Boolean, default: false },
    isOptionalEnabled: { type: Boolean, default: true },
    placeholder: { type: String },

    inDispatchCard: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    parentHeading: { type: String }, // Store heading name, not ID for immutability
    fieldVersion: { type: Date, default: Date.now }, // Track when field was captured
    originalFieldId: { type: String } // Store original field ID for reference
  }],

  comments: [commentSchema],
  audit: [auditSchema],
});

// ── Performance indexes for the most common query patterns ──
// The SRD list, dashboards and work-queues sort/filter on these fields heavily.
srdSchema.index({ createdAt: -1 });                  // default list sort
srdSchema.index({ updatedAt: -1 });                  // "recently updated" lists
srdSchema.index({ 'status.department': 1 });         // dept work-queue filtering
srdSchema.index({ 'status.department': 1, 'status.value': 1 }); // dept+status filter
srdSchema.index({ inProduction: 1 });                // production dashboard
srdSchema.index({ readyForProduction: 1, inProduction: 1 }); // production-manager queue
srdSchema.index({ currentProductionStage: 1 });      // stage dashboard
srdSchema.index({ inDispatch: 1 });                  // dispatch queue
srdSchema.index({ title: 1 });                       // text search on title
srdSchema.index({ isComplete: 1 });                  // completion filter

const REQUIRED_DEPTS = ['vmd', 'cad']; // Only VMD and CAD approval needed for production

srdSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const statusArray = this.status || [];
    const allApproved = REQUIRED_DEPTS.every(dept =>
      statusArray.find(s => s.department === dept)?.value === 'approved'
    );
    if (allApproved) {
      this.readyForProduction = true;
    }
  }
  next();
});

export default mongoose.models.SRD || mongoose.model('SRD', srdSchema);
