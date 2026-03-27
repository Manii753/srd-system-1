import mongoose from 'mongoose';

const buyerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: [{ type: String }],
  phone: [{ type: String }],
  contactPerson:[{
      name: { type: String },
      phone: { type: String },        
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});


export default mongoose.models.Buyer || mongoose.model('Buyer', buyerSchema);
