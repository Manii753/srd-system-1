import mongoose from "mongoose";

const FieldSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true
    },
    placeholder: {
        type: String
    },
    // department this field belongs to (vmd, cad, commercial, mmc or global)
    department: {
        type: String,
        default: 'global'
    },
    // whether the field is required when creating/updating an SRD
    isRequired: {
        type: Boolean,
        default: false
    },
    // a slug/key used by SRD records (optional)
    slug: {
        type: String
    },
    // soft-delete / active flag so removing a field does not delete existing SRD data
    active: {
        type: Boolean,
        default: true
    },
    // order/sequence for field display (lower numbers appear first)
    order: {
        type: Number,
        default: 0
    },
    // parent heading field ID for grouping (null for top-level fields)
    parentHeading: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Field',
        default: null
    },
    isShownInQuickDetails: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient ordering queries
FieldSchema.index({ department: 1, order: 1 });
FieldSchema.index({ parentHeading: 1, order: 1 });

export default mongoose.models.Field || mongoose.model("Field", FieldSchema);