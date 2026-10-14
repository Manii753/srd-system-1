import mongoose from 'mongoose';

/**
 * The user's explicit connection between a costing sheet and the SRD form.
 *
 * `entries` is a sparse map:  { [costingSourceKey]: fieldId }
 * e.g. { brand: '65f…', fit: '65g…', fabrics: '65h…' }
 *
 * A source key that isn't present is simply not pushed into the SR. The map
 * is looked up by `side` ('pre' | 'post') so pre- and post-costing can be
 * wired up independently.
 */
const costingFieldMapSchema = new mongoose.Schema({
  side: {
    type: String,
    enum: ['pre', 'post'],
    required: true,
  },
  // Sparse object: sourceKey -> SRD Field._id (string)
  entries: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedBy: { type: String, default: '' },
}, { timestamps: true, _id: false });

costingFieldMapSchema.index({ side: 1 }, { unique: true });

export default mongoose.models.CostingFieldMap
  || mongoose.model('CostingFieldMap', costingFieldMapSchema);