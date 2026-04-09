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
  internalEmails: [String], // Kept this as it was not explicitly removed by the instruction
  sampleDispatchedToBuyer: { type: Boolean, default: false },
  sampleDipatchedtoBuyerDate: { type: Date }, // Kept original name as instruction had both 'sampleDispatchedToBuyer' and 'sampleDipatchedtoBuyerDate'

  BuyerApproved: { type: Boolean, default: false },
  BuyerRejectedReasons: [{
    department: String,
    reason: String,
  }],
  BuyerApprovedBy: { type: String },
  BuyerComments: { type: String },
  BuyerApprovedDate: { type: Date },
  BuyerDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer' },
  DispatchDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch' },


  status:[{
    department: String,
    value: { type: String, enum: ['approved', 'rejected', 'flagged','in-progress', 'pending'], default: 'pending' },
    updatedAt: { type: Date, default: Date.now }
  }],

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
    isOptional: { type: Boolean, default: false },
    isOptionalEnabled: { type: Boolean, default: true },
    placeholder: { type: String },

    inDispatchCard: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    parentHeading: { type: String }, // Store heading name, not ID for immutability
    fieldVersion: { type: Date, default: Date.now }, // Track when field was captured
    originalFieldId: { type: String } // Store original field ID for reference
  }],

  // Support departments captured at SRD creation time (slugs of type:'support' depts)
  supportDepartments: [{ type: String }],

  comments: [commentSchema],
  audit: [auditSchema],
});

srdSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const statusArray = this.status || [];
    const depts = this.supportDepartments;

    if (depts && depts.length > 0) {
      const allApproved = depts.every(slug =>
        statusArray.find(s => s.department === slug)?.value === 'approved'
      );
      if (allApproved) this.readyForProduction = true;
    } else {
      // Fallback for SRDs created before supportDepartments was added
      const fallback = ['vmd', 'cad', 'commercial', 'mmc'];
      const allApproved = fallback.every(dept =>
        statusArray.find(s => s.department === dept)?.value === 'approved'
      );
      if (allApproved) this.readyForProduction = true;
    }
  }
  next();
});

export default mongoose.models.SRD || mongoose.model('SRD', srdSchema);
