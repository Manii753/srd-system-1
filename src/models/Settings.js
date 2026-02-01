import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true 
  },
  value: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  description: { 
    type: String 
  },
  updatedBy: {
    id: String,
    name: String,
    email: String
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Pre-defined settings keys
settingsSchema.statics.KEYS = {
  UPLOAD_PATH: 'uploadPath',
  UPLOAD_PATH_TYPE: 'uploadPathType', // 'local' or 'network'
};

// Default values
settingsSchema.statics.DEFAULTS = {
  uploadPath: './public/uploads',
  uploadPathType: 'local', // 'local' or 'network'
};

// Get a setting by key with default fallback
settingsSchema.statics.getSetting = async function(key) {
  const setting = await this.findOne({ key });
  if (setting) {
    return setting.value;
  }
  // Return default if exists
  const defaultKey = Object.keys(this.KEYS).find(k => this.KEYS[k] === key);
  if (defaultKey) {
    const defaultValue = this.DEFAULTS[key];
    return defaultValue !== undefined ? defaultValue : null;
  }
  return null;
};

// Set a setting value
settingsSchema.statics.setSetting = async function(key, value, updatedBy = null, description = null) {
  const updateData = { 
    value, 
    updatedAt: new Date() 
  };
  
  if (updatedBy) {
    updateData.updatedBy = updatedBy;
  }
  
  if (description) {
    updateData.description = description;
  }
  
  return this.findOneAndUpdate(
    { key },
    { $set: updateData },
    { upsert: true, new: true }
  );
};

// Get all upload-related settings
settingsSchema.statics.getUploadSettings = async function() {
  const uploadPath = await this.getSetting(this.KEYS.UPLOAD_PATH);
  const uploadPathType = await this.getSetting(this.KEYS.UPLOAD_PATH_TYPE);
  
  return {
    uploadPath: uploadPath || this.DEFAULTS.uploadPath,
    uploadPathType: uploadPathType || this.DEFAULTS.uploadPathType,
  };
};

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
