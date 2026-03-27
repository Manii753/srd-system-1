import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, default: '' }, // URL to uploaded logo image
}, { timestamps: true });


export default mongoose.models.Company || mongoose.model("Company", CompanySchema);
