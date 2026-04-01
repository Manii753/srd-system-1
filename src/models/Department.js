import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ['production', 'support'],
    
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
