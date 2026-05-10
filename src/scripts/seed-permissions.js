// Script to seed default role permissions
// Run with: node src/scripts/seed-permissions.js

const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  role: String,
  displayName: String,
  permissions: {
    canViewAll: Boolean,
    canCompleteAnyStage: Boolean,
    canReceiveAnyStage: Boolean,
    stages: [String]
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const RolePermission = mongoose.models.RolePermission || mongoose.model('RolePermission', rolePermissionSchema);

const defaultPermissions = [
  {
    role: 'admin',
    displayName: 'Administrator',
    permissions: {
      canViewAll: true,
      canCompleteAnyStage: true,
      canReceiveAnyStage: false,
      stages: ['pattern', 'sewing', 'washing', 'finishing', 'vmd']
    },
    isActive: true
  },
  {
    role: 'vmd',
    displayName: 'VMD',
    permissions: {
      canViewAll: true,
      canCompleteAnyStage: true,
      canReceiveAnyStage: false,
      stages: ['vmd']
    },
    isActive: true
  },
  {
    role: 'pattern',
    displayName: 'Pattern Department',
    permissions: {
      canViewAll: false,
      canCompleteAnyStage: false,
      canReceiveAnyStage: false,
      stages: ['pattern']
    },
    isActive: true
  },
  {
    role: 'sewing',
    displayName: 'Sewing Department',
    permissions: {
      canViewAll: false,
      canCompleteAnyStage: false,
      canReceiveAnyStage: false,
      stages: ['sewing']
    },
    isActive: true
  },
  {
    role: 'washing',
    displayName: 'Washing Department',
    permissions: {
      canViewAll: false,
      canCompleteAnyStage: false,
      canReceiveAnyStage: false,
      stages: ['washing']
    },
    isActive: true
  },
  {
    role: 'finishing',
    displayName: 'Finishing Department',
    permissions: {
      canViewAll: false,
      canCompleteAnyStage: false,
      canReceiveAnyStage: false,
      stages: ['finishing']
    },
    isActive: true
  },
  {
    role: 'cutting',
    displayName: 'Cutting Department',
    permissions: {
      canViewAll: false,
      canCompleteAnyStage: false,
      canReceiveAnyStage: false,
      stages: []
    },
    isActive: true
  }
];

async function seedPermissions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://192.168.100.2:27017/srd-system';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing permissions
    await RolePermission.deleteMany({});
    console.log('Cleared existing permissions');

    // Insert default permissions
    await RolePermission.insertMany(defaultPermissions);
    console.log('Seeded default permissions');

    console.log('\nDefault permissions created:');
    defaultPermissions.forEach(perm => {
      console.log(`- ${perm.displayName} (${perm.role})`);
      console.log(`  View All: ${perm.permissions.canViewAll}`);
      console.log(`  Stages: ${perm.permissions.stages.join(', ') || 'None'}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  }
}

seedPermissions();
