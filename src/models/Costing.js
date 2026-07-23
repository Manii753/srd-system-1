import mongoose from 'mongoose';

// A single item row: description + consumption/qty + price + amount (auto)
const costRowSchema = new mongoose.Schema({
  description: { type: String, default: '' },
  code:        { type: String, default: '' },  // Fabric code (for fabrics section)
  consumption:  { type: Number, default: 0 },  // CONSUMP column
  price:        { type: Number, default: 0 },  // PRICE column
  amount:       { type: Number, default: 0 },  // AMOUNT = consumption * price (auto)
}, { _id: false });

const imageSchema = new mongoose.Schema({
  url:     { type: String, default: '' },
  caption: { type: String, default: '' },
}, { _id: false });

const costingDataSchema = new mongoose.Schema({
  currency: { type: String, default: 'USD' },

  // ── Header info ──────────────────────────────────────────────────
  date:             { type: String, default: '' },
  brand:            { type: String, default: '' },
  fitSpecsCode:     { type: String, default: '' },
  fit:              { type: String, default: '' },
  description:      { type: String, default: '' },
  fabricType:       { type: String, default: '' },
  embellishmentYesNo: { type: String, default: 'No' },  // "Yes" or "No"
  costingBase:      { type: String, default: 'Image' },  // "Image" or "CAD"
  sampleSize:       { type: String, default: '' },
  // Legacy fields (kept for backward compatibility)
  buyer:            { type: String, default: '' },
  style:            { type: String, default: '' },
  fabric:           { type: String, default: '' },
  wash:             { type: String, default: '' },

  // ── FABRICS ──────────────────────────────────────────────────────
  fabrics: { type: [costRowSchema], default: [] },

  // ── BEFORE WASH TRIMS ────────────────────────────────────────────
  beforeWashTrims: { type: [costRowSchema], default: [] },

  // ── AFTER WASH TRIMS ─────────────────────────────────────────────
  afterWashTrims: { type: [costRowSchema], default: [] },

  // ── EMBELLISHMENT ────────────────────────────────────────────────
  embellishment: { type: [costRowSchema], default: [] },

  // ── PRODUCTION COST ──────────────────────────────────────────────
  cmtLevel:    { type: Number, default: 0 },  // CMT Codes Req Level 1 2 3
  washingLevel:{ type: Number, default: 0 },  // Washing Codes Req Level 1 2 3
  fob:         { type: Number, default: 0 },

  // ── FREIGHT ──────────────────────────────────────────────────────
  freight: { type: Number, default: 0 },

  // ── MARGIN & COMMISSION ──────────────────────────────────────────
  marginPct:      { type: Number, default: 0 },  // Percentage %
  extraCut:       { type: Number, default: 0 },
  ldMargin:       { type: Number, default: 0 },
  testingCharges: { type: Number, default: 0 },
  commission:     { type: Number, default: 0 },

  // ── SUMMARY ──────────────────────────────────────────────────────
  totalPricePkr:  { type: Number, default: 0 },  // calculated
  finalFobUs:     { type: Number, default: 0 },  // computed (PKR / currency rate)
  currencyRate:   { type: Number, default: 265 },  // PKR per USD default

  // ── QUOTE TRACKING ───────────────────────────────────────────────
  firstQuoted:    { type: Number, default: 0 },
  targetPrice:    { type: Number, default: 0 },
  difference:     { type: Number, default: 0 },  // auto: firstQuoted - targetPrice
  secondQuote:    { type: Number, default: 0 },
  confirmedPrice: { type: Number, default: 0 },

  // ── IMAGES ───────────────────────────────────────────────────────
  images: { type: [imageSchema], default: [] },

  // ── Workflow ──────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft',
  },
  submittedBy:  { type: String, default: '' },
  submittedAt:  { type: Date },
  approvedBy:   { type: String, default: '' },
  approvedAt:   { type: Date },
  notes:        { type: String, default: '' },
}, { _id: false });

const costingSchema = new mongoose.Schema({
  srd: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SRD',
    required: false,
    // No default value - field won't exist if not provided
  },
  standalone: { type: Boolean, default: false }, // true = not linked to any SRD
  pocNumber: { type: Number, default: null },     // auto-incrementing: 1, 2, 3...
  preCost:  { type: costingDataSchema, default: () => ({}) },
  postCost: { type: costingDataSchema, default: () => ({}) },
  createdBy: { type: String, default: '' },
  updatedBy: { type: String, default: '' },
}, { timestamps: true });

// Create sparse unique index on srd - allows multiple null values
// Only non-null srd values must be unique (one costing per SRD)
costingSchema.index({ srd: 1 }, { unique: true, sparse: true });

export default mongoose.models.Costing || mongoose.model('Costing', costingSchema);
