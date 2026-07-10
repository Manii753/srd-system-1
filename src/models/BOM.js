import mongoose from 'mongoose';

// ─── Row schemas ──────────────────────────────────────────────────────────────

const fabricRowSchema = new mongoose.Schema({
  description:  { type: String, default: '' },
  composition:  { type: String, default: '' }, // Composition / Color
  placement:    { type: String, default: '' },
  sourceOrigin: { type: String, default: '' }, // Source / Origin
  consNo:       { type: Number, default: 0 },  // CONS NO
  portngPcs:    { type: Number, default: 0 },  // FRTNG PCS
  cons:         { type: Number, default: 0 },  // CONS (final)
}, { _id: false });

const trimRowSchema = new mongoose.Schema({
  description: { type: String, default: '' },
  placement:   { type: String, default: '' },
  uom:         { type: String, default: '' },  // Unit of measure
  cons:        { type: Number, default: 0 },
  portngPcs:   { type: Number, default: 0 },   // PORTNG PCS
  totalCons:   { type: Number, default: 0 },   // Total CONS
}, { _id: false });

// ─── Size grid row ────────────────────────────────────────────────────────────
const sizeGridSchema = new mongoose.Schema({
  label:       { type: String, default: '' }, // "PO QTY", "CUT QTY @ LDM", etc.
  xs:          { type: Number, default: 0 },
  s:           { type: Number, default: 0 },
  m:           { type: Number, default: 0 },
  l:           { type: Number, default: 0 },
  xl:          { type: Number, default: 0 },
  xxl:         { type: Number, default: 0 },
  total:       { type: Number, default: 0 },
}, { _id: false });

// ─── Main BOM schema ──────────────────────────────────────────────────────────

const bomSchema = new mongoose.Schema({
  srd: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SRD',
    required: true,
    unique: true,
  },

  // ── Header meta ──────────────────────────────────────────────────────────
  season:       { type: String, default: '' },
  date:         { type: String, default: '' },
  buyer:        { type: String, default: '' },
  style:        { type: String, default: '' },
  fabric:       { type: String, default: '' },
  yarn:         { type: String, default: '' },
  styleName:    { type: String, default: '' },
  composition:  { type: String, default: '' },
  construction: { type: String, default: '' },
  washColor:    { type: String, default: '' },
  fit:          { type: String, default: '' },
  referenceNo:  { type: String, default: '' },

  // ── Size grid ─────────────────────────────────────────────────────────────
  sizeGrid: { type: [sizeGridSchema], default: [] },

  // ── Material sections ─────────────────────────────────────────────────────
  fabricDetails:         { type: [fabricRowSchema], default: [] },
  beforeWashTrims:       { type: [trimRowSchema],   default: [] },
  afterWashTrims:        { type: [trimRowSchema],   default: [] },

  // ── Special comments ──────────────────────────────────────────────────────
  specialComments: { type: String, default: '' },

  // ── Footer signatories ────────────────────────────────────────────────────
  preparedBy:  { type: String, default: '' },
  verifiedBy:  { type: String, default: '' },
  approvedBy:  { type: String, default: '' },

  // ── Workflow ──────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft',
  },
  submittedBy: { type: String, default: '' },
  submittedAt: { type: Date },
  approvedByName: { type: String, default: '' },
  approvedAt:  { type: Date },

  createdBy:   { type: String, default: '' },
  updatedBy:   { type: String, default: '' },
}, { timestamps: true });

if (mongoose.models.BOM) delete mongoose.models.BOM;
export default mongoose.model('BOM', bomSchema);
