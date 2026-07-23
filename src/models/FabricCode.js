import mongoose from 'mongoose';

const fabricCodeSchema = new mongoose.Schema({
  code:        { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
});

fabricCodeSchema.index({ code: 'text', description: 'text' });

export default mongoose.models.FabricCode || mongoose.model('FabricCode', fabricCodeSchema);
