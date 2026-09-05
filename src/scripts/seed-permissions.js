// Script to seed default role permissions
// Run with: node src/scripts/seed-permissions.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const rolePermissionSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true, lowercase: true },
  displayName: String,
  permissions: {
    canViewAll: Boolean,
    canCompleteAnyStage: Boolean,
    canReceiveAnyStage: Boolean,
    stages: [String],
    canCreateSRD: Boolean,
    canEditSRD: Boolean,
    canDeleteSRD: Boolean,
    canViewAllSRDs: Boolean,
    canApproveAnyDepartment: Boolean,
    canAccessAdminPortal: Boolean,
    canManageUsers: Boolean,
    canManageDepartments: Boolean,
    canManagePermissions: Boolean,
    canManageSRDFields: Boolean,
    canAccessSettings: Boolean,
    canViewReports: Boolean,
    canExportData: Boolean,
    canViewDispatch: Boolean,
    canManageDispatch: Boolean,
    canViewBuyerComments: Boolean,
    canAddBuyerComments: Boolean,
    canViewSampleCard: Boolean,
    canEditSampleCard: Boolean,
    canViewCostSheets: Boolean,
    canEditCostSheets: Boolean,
    canViewBOM: Boolean,
    canEditBOM: Boolean,
    canViewPlanning: Boolean,
    canEditPlanning: Boolean,
    canViewOrderConfirmation: Boolean,
    canEditOrderConfirmation: Boolean,
  },
  sidebarMenuItems: [String],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
});

const RolePermission =
  mongoose.models.RolePermission ||
  mongoose.model('RolePermission', rolePermissionSchema);

const makePermissions = (overrides = {}) => ({
  canViewAll: false,
  canCompleteAnyStage: false,
  canReceiveAnyStage: false,
  stages: [],
  canCreateSRD: false,
  canEditSRD: false,
  canDeleteSRD: false,
  canViewAllSRDs: false,
  canApproveAnyDepartment: false,
  canAccessAdminPortal: false,
  canManageUsers: false,
  canManageDepartments: false,
  canManagePermissions: false,
  canManageSRDFields: false,
  canAccessSettings: false,
  canViewReports: false,
  canExportData: false,
  canViewDispatch: false,
  canManageDispatch: false,
  canViewBuyerComments: false,
  canAddBuyerComments: false,
  canViewSampleCard: false,
  canEditSampleCard: false,
  canViewCostSheets: false,
  canEditCostSheets: false,
  canViewBOM: false,
  canEditBOM: false,
  canViewPlanning: false,
  canEditPlanning: false,
  canViewOrderConfirmation: false,
  canEditOrderConfirmation: false,
  ...overrides,
});

const defaultPermissions = [
  {
    role: 'admin',
    displayName: 'Administrator',
    permissions: makePermissions({
      canViewAll: true,
      canCompleteAnyStage: true,
      canAccessAdminPortal: true,
      canManageUsers: true,
      canManageDepartments: true,
      canManagePermissions: true,
      canManageSRDFields: true,
      canAccessSettings: true,
      canViewReports: true,
      canExportData: true,
      canViewDispatch: true,
      canManageDispatch: true,
      canViewBuyerComments: true,
      canAddBuyerComments: true,
      canViewSampleCard: true,
      canEditSampleCard: true,
      canViewCostSheets: true,
      canEditCostSheets: true,
      canViewBOM: true,
      canEditBOM: true,
      canViewPlanning: true,
      canEditPlanning: true,
      canViewOrderConfirmation: true,
      canEditOrderConfirmation: true,
      stages: ['pattern', 'sewing', 'washing', 'finishing', 'vmd'],
    }),
    sidebarMenuItems: [
      'home',
      'order-confirmation',
      'samples-management',
      'create-srd',
      'sample-request',
      'sample-process',
      'sample-card',
      'dispatch',
      'reports',
      'buyer-comment',
      'cost-sheets',
      'bom',
      'planning',
      'all-srds',
      'srd-fields',
      'users',
      'permissions',
      'settings',
    ],
    isActive: true,
  },
  {
    role: 'vmd',
    displayName: 'VMD',
    permissions: makePermissions({
      canViewAll: true,
      canCompleteAnyStage: true,
      canViewAllSRDs: true,
      canApproveAnyDepartment: true,
      canCreateSRD: true,
      canEditSRD: true,
      canViewReports: true,
      canExportData: true,
      canViewDispatch: true,
      canManageDispatch: true,
      canViewBuyerComments: true,
      canAddBuyerComments: true,
      canViewSampleCard: true,
      canEditSampleCard: true,
      canViewCostSheets: true,
      canEditCostSheets: true,
      canViewBOM: true,
      canEditBOM: true,
      canViewPlanning: true,
      canEditPlanning: true,
      canViewOrderConfirmation: true,
      canEditOrderConfirmation: true,
      stages: ['vmd'],
    }),
    sidebarMenuItems: [
      'home',
      'order-confirmation',
      'samples-management',
      'sample-process',
      'sample-card',
      'dispatch',
      'reports',
      'buyer-comment',
      'cost-sheets',
      'bom',
      'planning',
      'all-srds',
      'create-srd',
    ],
    isActive: true,
  },
  {
    role: 'pattern',
    displayName: 'Pattern Department',
    permissions: makePermissions({
      stages: ['pattern'],
    }),
    sidebarMenuItems: ['home', 'all-srds', 'sample-process', 'sample-card'],
    isActive: true,
  },
  {
    role: 'sewing',
    displayName: 'Sewing Department',
    permissions: makePermissions({
      stages: ['sewing'],
    }),
    sidebarMenuItems: ['home', 'all-srds', 'sample-process', 'sample-card'],
    isActive: true,
  },
  {
    role: 'washing',
    displayName: 'Washing Department',
    permissions: makePermissions({
      stages: ['washing'],
    }),
    sidebarMenuItems: ['home', 'all-srds', 'sample-process', 'sample-card'],
    isActive: true,
  },
  {
    role: 'finishing',
    displayName: 'Finishing Department',
    permissions: makePermissions({
      stages: ['finishing'],
    }),
    sidebarMenuItems: ['home', 'all-srds', 'sample-process', 'sample-card'],
    isActive: true,
  },
  {
    role: 'cutting',
    displayName: 'Cutting Department',
    permissions: makePermissions({}),
    sidebarMenuItems: ['home', 'all-srds', 'sample-process', 'sample-card'],
    isActive: true,
  },
  {
    role: 'cad',
    displayName: 'CAD',
    permissions: makePermissions({
      canCreateSRD: true,
      canEditSRD: true,
      canViewAllSRDs: true,
      canViewReports: true,
      stages: ['cad'],
    }),
    sidebarMenuItems: ['home', 'order-confirmation', 'all-srds', 'sample-process', 'create-srd'],
    isActive: true,
  },
  {
    role: 'commercial',
    displayName: 'Commercial',
    permissions: makePermissions({
      canCreateSRD: true,
      canEditSRD: true,
      canViewAllSRDs: true,
      canViewReports: true,
      canViewOrderConfirmation: true,
      canEditOrderConfirmation: true,
      stages: ['commercial'],
    }),
    sidebarMenuItems: ['home', 'order-confirmation', 'all-srds', 'sample-process', 'create-srd'],
    isActive: true,
  },
  {
    role: 'mmc',
    displayName: 'MMC',
    permissions: makePermissions({
      canCreateSRD: true,
      canEditSRD: true,
      canViewAllSRDs: true,
      canViewReports: true,
      canViewOrderConfirmation: true,
      canEditOrderConfirmation: true,
      stages: ['mmc'],
    }),
    sidebarMenuItems: ['home', 'order-confirmation', 'all-srds', 'sample-process', 'create-srd'],
    isActive: true,
  },
  {
    role: 'production-manager',
    displayName: 'Production Manager',
    permissions: makePermissions({
      canViewAll: true,
      canViewAllSRDs: true,
      canViewReports: true,
      canViewDispatch: true,
    }),
    sidebarMenuItems: ['home', 'production', 'all-srds', 'sample-process', 'dispatch'],
    isActive: true,
  },
];

async function seedPermissions() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not set. Copy .env to the project root and set MONGODB_URI.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await RolePermission.deleteMany({});
    console.log('Cleared existing permissions');

    await RolePermission.insertMany(
      defaultPermissions.map((p) => ({ ...p, createdAt: new Date(), updatedAt: new Date() }))
    );
    console.log(`Seeded ${defaultPermissions.length} default permission sets`);

    defaultPermissions.forEach((perm) => {
      console.log(`- ${perm.displayName} (${perm.role})`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  }
}

seedPermissions();