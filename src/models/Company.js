import mongoose from "mongoose";

const paginationPageSchema = {
  enabled: { type: Boolean, default: true },
  itemsPerPage: { type: Number, default: 10 },
};

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, default: '' },
  CurrentSRDPrefix: { type: String, default: 'SRD-' },
  currentSRDNumber: { type: Number, default: 1000 },
  paginationSettings: {
    // SRD list table (all pages that use SRDTable)
    srdList: { ...paginationPageSchema },
    // Excel/form view pages inside an SRD (DepartmentPanelExcel)
    srdForm: {
      enabled: { type: Boolean, default: true },
      itemsPerPage: { type: Number, default: 12 }, // cells per page in the form view
    },
  },
  // Number of days before a pending SRD is marked as delayed
  delayThresholdDays: { type: Number, default: 3 },
}, { timestamps: true, strict: false });

// Delete cached model to pick up schema changes in dev
if (mongoose.models.Company) delete mongoose.models.Company;
export default mongoose.model("Company", CompanySchema);
