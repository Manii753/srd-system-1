import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true 
  },
  department: String,
  isActive: { type: Boolean, default: true },
  onlineStatus: { 
    type: String, 
    enum: ['online', 'offline', 'away'], 
    default: 'offline' 
  },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    },
    expirationTime: Number,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }]
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default mongoose.models.User || mongoose.model('User', userSchema);