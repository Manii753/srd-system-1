import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: '' },
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
  
  // User-specific permissions
  permissions: {
    // Sample Process Permissions
    canViewAll: { type: Boolean, default: false },
    canCompleteAnyStage: { type: Boolean, default: false },
    canReceiveAnyStage: { type: Boolean, default: false },
    stages: { type: [String], default: [] },
    
    // SRD Management Permissions
    canCreateSRD: { type: Boolean, default: false },
    canEditSRD: { type: Boolean, default: false },
    canDeleteSRD: { type: Boolean, default: false },
    canViewAllSRDs: { type: Boolean, default: false },
    // Grant this user (typically a VMD) the ability to approve other
    // departments' requests (VMD, CAD, MMC, COM) from the status bar.
    canApproveAnyDepartment: { type: Boolean, default: false },
    
    // Admin Portal Permissions
    canAccessAdminPortal: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canManageDepartments: { type: Boolean, default: false },
    canManagePermissions: { type: Boolean, default: false },
    canManageSRDFields: { type: Boolean, default: false },
    canAccessSettings: { type: Boolean, default: false },
    
    // Brand Groups Permissions
    canManageBrandGroups: { type: Boolean, default: false },
    
    // Reports & Data Permissions
    canViewReports: { type: Boolean, default: false },
    canExportData: { type: Boolean, default: false },
    
    // Dispatch Permissions
    canViewDispatch: { type: Boolean, default: false },
    canManageDispatch: { type: Boolean, default: false },
    
    // Buyer Comments Permissions
    canViewBuyerComments: { type: Boolean, default: false },
    canAddBuyerComments: { type: Boolean, default: false },
    
    // Sample Card Permissions
    canViewSampleCard: { type: Boolean, default: false },
    canEditSampleCard: { type: Boolean, default: false },
    
    // Cost Sheet Permissions
    canViewCostSheets: { type: Boolean, default: false },
    canEditCostSheets: { type: Boolean, default: false },
    
    // BOM Permissions
    canViewBOM: { type: Boolean, default: false },
    canEditBOM: { type: Boolean, default: false },
    
    // Planning Permissions
    canViewPlanning: { type: Boolean, default: false },
    canEditPlanning: { type: Boolean, default: false },
    
    // Order Confirmation Permissions
    canViewOrderConfirmation: { type: Boolean, default: false },
    canEditOrderConfirmation: { type: Boolean, default: false }
  },
  
  // Sidebar Menu Configuration
  sidebarMenuItems: {
    type: [String],
    default: []
  },
  
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

// Performance indexes for the most common user queries
userSchema.index({ department: 1 });      // notification fan-out & status lookups
userSchema.index({ role: 1 });            // role-based notifications/perms
userSchema.index({ createdAt: -1 });      // users list default sort

export default mongoose.models.User || mongoose.model('User', userSchema);