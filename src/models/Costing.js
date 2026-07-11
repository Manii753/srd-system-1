import mongoose from 'mongoose';

// A single item row: description + consumption/qty + price + amount (auto)
const costRowSchema = new mongoose.Schema({
  description: { type: String, default: '' },
  consumption:  { type: Number, default: 0 },  // CONSUMP column
  price:        { type: Number, default: 0 },  // PRICE column
  amount:       { type: Number, default: 0 },  // AMOUNT = consumption * price (auto)
}, { _id: false });

const costingDataSchema = new mongoose.Schema({
  currency: { type: String, default: 'USD' },

  // ── Header info ──────────────────────────────────────────────────
  date:   { type: String, default: '' },
  buyer:  { type: String, default: '' },
  style:  { type: String, default: '' },
  fit:    { type: String, default: '' },
  fabric: { type: String, default: '' },
  wash:   { type: String, default: '' },

  // ── FABRICS ──────────────────────────────────────────────────────
  fabrics: { type: [costRowSchema], default: [] },
  // default rows: Fabric, Fabric 2, Pocketing

  // ── BEFORE WASH TRIMS ────────────────────────────────────────────
  beforeWashTrims: { type: [costRowSchema], default: [] },
  // default rows from SRD field or: Thread, Wash Care Label, Knee DP OFF, EL FLIP,
  //   Pocket Zip, Cord, Web Elastic Hem

  // ── AFTER WASH TRIMS ─────────────────────────────────────────────
  afterWashTrims: { type: [costRowSchema], default: [] },
  // default rows from SRD field or: PJ Patch, Grand Label, Size Label,
  //   Buttons/Metal, Rivets, Fly Button, Popper, Buckle, Draw Cord,
  //   Swing Tag, Hans Tag, Cord

  // ── PACKAGING ────────────────────────────────────────────────────
  packaging: { type: [costRowSchema], default: [] },
  // default: Barcode Sticker, Polybag, Carton, Carton Sticker, Carton Tape

  // ── EMBELLISHMENT ────────────────────────────────────────────────
  embellishment: { type: [costRowSchema], default: [] },
  // default: Hotfix, Screen Print, Rhinestone, Applique Fabric, Applique Cutting,
  //   Text Applique Fabric, Text Applique Cutting, Text Print, RIP & Repair Fabric

  // ── TESTING CHARGES (single fixed value, editable) ───────────────
  testingCharges: { type: Number, default: 0 },

  // ── FIXED / LABOUR CHARGES ───────────────────────────────────────
  patchesAttachment:  { type: Number, default: 0 },
  gussetAttachment:   { type: Number, default: 0 },
  badgesAttachments:  { type: Number, default: 0 },
  cmtCargo:           { type: Number, default: 0 },
  cmtsPocket:         { type: Number, default: 0 },
  oh:                 { type: Number, default: 0 },
  washing:            { type: Number, default: 0 },
  extraCut:           { type: Number, default: 0 },
  fob:                { type: Number, default: 0 },

  // ── SUMMARY ──────────────────────────────────────────────────────
  total:        { type: Number, default: 0 },  // sum of everything above
  loMargin:     { type: Number, default: 0 },
  priceIsPkr:   { type: Number, default: 0 },
  linds:        { type: Number, default: 0 },
  finalFobUs:   { type: Number, default: 0 },  // computed
  pchErrorPct:  { type: Number, default: 0 },  // P.CH+ERROR%
  totalCost:    { type: Number, default: 0 },  // final bottom line

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
