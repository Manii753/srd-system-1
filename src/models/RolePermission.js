import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true
  },
  permissions: {
    // Sample Process Permissions
    canViewAll: {
      type: Boolean,
      default: false,
      description: 'Can view all samples regardless of stage'
    },
    canCompleteAnyStage: {
      type: Boolean,
      default: false,
      description: 'Can complete any stage (admin override)'
    },
    canReceiveAnyStage: {
      type: Boolean,
      default: false,
      description: 'Can receive samples for any department'
    },
    stages: {
      type: [String],
      default: [],
      description: 'Stages this role can receive samples for'
    },
    
    // SRD Management Permissions
    canCreateSRD: {
      type: Boolean,
      default: false,
      description: 'Can create new Sample Request Documents'
    },
    canEditSRD: {
      type: Boolean,
      default: false,
      description: 'Can edit SRD details'
    },
    canDeleteSRD: {
      type: Boolean,
      default: false,
      description: 'Can delete SRDs'
    },
    canViewAllSRDs: {
      type: Boolean,
      default: false,
      description: 'Can view all SRDs (not just own department)'
    },
    canApproveAnyDepartment: {
      type: Boolean,
      default: false,
      description: 'Can approve VMD, CAD, MMC and COM from the status bar'
    },
    
    // Admin Portal Permissions
    canAccessAdminPortal: {
      type: Boolean,
      default: false,
      description: 'Can access admin portal pages'
    },
    canManageUsers: {
      type: Boolean,
      default: false,
      description: 'Can create, edit, and delete users'
    },
    canManageDepartments: {
      type: Boolean,
      default: false,
      description: 'Can manage department settings'
    },
    canManagePermissions: {
      type: Boolean,
      default: false,
      description: 'Can modify role permissions'
    },
    canManageSRDFields: {
      type: Boolean,
      default: false,
      description: 'Can configure SRD fields'
    },
    canAccessSettings: {
      type: Boolean,
      default: false,
      description: 'Can access system settings'
    },
    
    // Brand Groups Permissions
    canManageBrandGroups: {
      type: Boolean,
      default: false,
      description: 'Can create, edit, delete brand groups and assign users to them on the SR In Process page'
    },
    
    // Reports & Data Permissions
    canViewReports: {
      type: Boolean,
      default: false,
      description: 'Can view reports section'
    },
    canExportData: {
      type: Boolean,
      default: false,
      description: 'Can export data and reports'
    },
    
    // Dispatch Permissions
    canViewDispatch: {
      type: Boolean,
      default: false,
      description: 'Can view dispatch details'
    },
    canManageDispatch: {
      type: Boolean,
      default: false,
      description: 'Can update dispatch information'
    },
    
    // Buyer Comments Permissions
    canViewBuyerComments: {
      type: Boolean,
      default: false,
      description: 'Can view buyer comments'
    },
    canAddBuyerComments: {
      type: Boolean,
      default: false,
      description: 'Can add buyer comments'
    },
    
    // Sample Card Permissions
    canViewSampleCard: {
      type: Boolean,
      default: false,
      description: 'Can view sample cards'
    },
    canEditSampleCard: {
      type: Boolean,
      default: false,
      description: 'Can edit sample cards'
    },
    
    // Cost Sheet Permissions
    canViewCostSheets: {
      type: Boolean,
      default: false,
      description: 'Can view cost sheets'
    },
    canEditCostSheets: {
      type: Boolean,
      default: false,
      description: 'Can edit cost sheets'
    },
    
    // BOM Permissions
    canViewBOM: {
      type: Boolean,
      default: false,
      description: 'Can view Bill of Materials'
    },
    canEditBOM: {
      type: Boolean,
      default: false,
      description: 'Can edit Bill of Materials'
    },
    
    // Planning Permissions
    canViewPlanning: {
      type: Boolean,
      default: false,
      description: 'Can view planning section'
    },
    canEditPlanning: {
      type: Boolean,
      default: false,
      description: 'Can edit planning'
    },
    
    // Order Confirmation Permissions
    canViewOrderConfirmation: {
      type: Boolean,
      default: false,
      description: 'Can view order confirmation'
    },
    canEditOrderConfirmation: {
      type: Boolean,
      default: false,
      description: 'Can edit order confirmation'
    }
  },
  
  // Sidebar Menu Configuration
  sidebarMenuItems: {
    type: [String],
    default: [],
    description: 'Menu items to show in sidebar for this role'
  },
  isActive: {
    type: Boolean,
    default: true
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

rolePermissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.RolePermission || mongoose.model('RolePermission', rolePermissionSchema);
