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
    // whether this field is user-enabled per SRD before it can be filled/printed
    isOptional: {
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
    },
    // Flag to enable field connection
    isConnectedTo: {
        type: Boolean,
        default: false
    },
    // The field this one is connected to (only used when isConnectedTo is true)
    connectedFieldId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Field',
        default: null
    },
    // Connection type:
    // 'auto-true': When THIS field becomes true, the connected field also becomes true
    // 'toggle-active': This field is only active/visible when the connected field is false
    // 'is-attached': This image field marks the connected field as having an attachment
    connectionType: {
        type: String,
        enum: ['auto-true', 'toggle-active', 'is-attached', null],
        default: null
    },
    // For boolean fields: 'yes-no' or 'instock-purchase'
    booleanDisplayType: {
        type: String,
        enum: ['yes-no', 'instock-purchase', null],
        default: 'yes-no'
    },
    // For table fields: custom column headers
    tableHeaders: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

// Index for efficient ordering queries
FieldSchema.index({ department: 1, order: 1 });
FieldSchema.index({ parentHeading: 1, order: 1 });

// Force recompilation to pick up new schema changes (especially in dev)
delete mongoose.models.Field;

export default mongoose.model("Field", FieldSchema);
