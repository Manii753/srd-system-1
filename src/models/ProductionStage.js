import mongoose from 'mongoose';
import {
  formatProductionStageDisplayName,
  slugifyProductionStageValue,
} from '../lib/productionStageUtils.js';

const productionStageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    default: function () {
      return formatProductionStageDisplayName(this.name || this.slug);
    }
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    default: function () {
      return slugifyProductionStageValue(this.name || this.displayName);
    }
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: String,
  color: {
    type: String,
    default: '#3b82f6'
  },
  icon: String,
  estimatedDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  requirements: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

productionStageSchema.pre('validate', function (next) {
  if (this.name) {
    this.name = this.name.trim();
  }

  if (this.displayName) {
    this.displayName = this.displayName.trim();
  }

  if (this.slug) {
    this.slug = slugifyProductionStageValue(this.slug);
  }

  if (!this.displayName && (this.name || this.slug)) {
    this.displayName = formatProductionStageDisplayName(this.name || this.slug);
  }

  if (!this.slug && (this.name || this.displayName)) {
    this.slug = slugifyProductionStageValue(this.name || this.displayName);
  }

  if (!this.name && this.displayName) {
    this.name = this.displayName;
  }

  this.updatedAt = new Date();
  next();
});

// Delete existing model if it exists
if (mongoose.models.ProductionStage) {
  delete mongoose.models.ProductionStage;
}

export default mongoose.model('ProductionStage', productionStageSchema);
