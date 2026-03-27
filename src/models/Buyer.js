import mongoose from 'mongoose';

const buyerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: [{ type: String }],
  phone: [{ type: String }],
  address: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

delete mongoose.models.Buyer;

export default mongoose.models.Buyer || mongoose.model('Buyer', buyerSchema);
