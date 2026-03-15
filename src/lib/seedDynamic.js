import mongoose from 'mongoose';
import Department from '../models/Department.js';
import Stage from '../models/Stage.js';
import Field from '../models/Field.js';
import ProductionStage from '../models/ProductionStage.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function seedDynamic() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Department.deleteMany({});
    await Stage.deleteMany({});
    await ProductionStage.deleteMany({});
    console.log('Cleared existing departments, stages, and production stages');

    // Create Departments
    const departments = await Department.insertMany([
      {
        name: 'Visual Merchandising & Design',
        slug: 'vmd',
        description: 'Responsible for creating and managing sample requests'
      },
      {
        name: 'Computer Aided Design',
        slug: 'cad',
        description: 'Technical design and pattern development'
      },
      {
        name: 'Commercial',
        slug: 'commercial',
        description: 'Supplier management and procurement'
      },
      {
        name: 'Manufacturing & Quality Control',
        slug: 'mmc',
        description: 'Production planning and quality assurance'
      }
    ]);

    console.log(`Created ${departments.length} departments`);

    // Create Stages
    const stages = await Stage.insertMany([
      {
        name: 'Pending',
        slug: 'pending',
        description: 'Awaiting action',
        color: '#9CA3AF',
        icon: 'Clock',
        order: 0,
        isActive: true,
        departments: [],
        isAutomatic: false
      },
      {
        name: 'In Progress',
        slug: 'in-progress',
        description: 'Currently being worked on',
        color: '#3B82F6',
        icon: 'RefreshCw',
        order: 1,
        isActive: true,
        departments: [],
        isAutomatic: false
      },
      {
        name: 'Flagged',
        slug: 'flagged',
        description: 'Requires attention or has issues',
        color: '#EF4444',
        icon: 'Flag',
        order: 2,
        isActive: true,
        departments: [],
        isAutomatic: false
      },
      {
        name: 'Approved',
        slug: 'approved',
        description: 'Completed and approved',
        color: '#10B981',
        icon: 'CheckCircle',
        order: 3,
        isActive: true,
        departments: [],
        isAutomatic: false
      },
      {
        name: 'Ready for Production',
        slug: 'ready-for-production',
        description: 'All departments approved, ready to manufacture',
        color: '#8B5CF6',
        icon: 'Package',
        order: 4,
        isActive: true,
        departments: [],
        isAutomatic: true
      }
    ]);

    console.log(`Created ${stages.length} stages`);

    // Create some default fields
    const fields = await Field.insertMany([
      {
        name: 'Sample Type',
        type: 'text',
        placeholder: 'e.g., T-Shirt, Dress, Jacket',
        department: 'global',
        isRequired: true,
        slug: 'sample-type',
        active: true
      },
      {
        name: 'Priority',
        type: 'text',
        placeholder: 'High, Medium, Low',
        department: 'global',
        isRequired: true,
        slug: 'priority',
        active: true
      },
      {
        name: 'Target Date',
        type: 'date',
        placeholder: '',
        department: 'global',
        isRequired: false,
        slug: 'target-date',
        active: true
      },
      {
        name: 'Fabric Consumption',
        type: 'number',
        placeholder: 'Meters',
        department: 'cad',
        isRequired: false,
        slug: 'fabric-consumption',
        active: true
      },
      {
        name: 'Supplier Quote',
        type: 'number',
        placeholder: 'USD',
        department: 'commercial',
        isRequired: false,
        slug: 'supplier-quote',
        active: true
      },
      {
        name: 'Production Time',
        type: 'number',
        placeholder: 'Days',
        department: 'mmc',
        isRequired: false,
        slug: 'production-time',
        active: true
      }
    ]);

    console.log(`Created ${fields.length} default fields`);

    // Create Production Stages
    const productionStages = await ProductionStage.insertMany([
      {
        name: 'Fabric Sourcing',
        displayName: 'Fabric Sourcing',
        slug: 'fabric-sourcing',
        description: 'Sourcing and procurement of required fabrics',
        color: '#3B82F6',
        icon: 'ShoppingCart',
        order: 0,
        estimatedDuration: 7,
        isActive: true
      },
      {
        name: 'Cutting',
        displayName: 'Cutting',
        slug: 'cutting',
        description: 'Fabric cutting according to patterns',
        color: '#8B5CF6',
        icon: 'Scissors',
        order: 1,
        estimatedDuration: 3,
        isActive: true
      },
      {
        name: 'Sewing',
        displayName: 'Sewing',
        slug: 'sewing',
        description: 'Sewing and assembly of garment pieces',
        color: '#10B981',
        icon: 'Layers',
        order: 2,
        estimatedDuration: 5,
        isActive: true
      },
      {
        name: 'Quality Check',
        displayName: 'Quality Check',
        slug: 'quality-check',
        description: 'Quality inspection and testing',
        color: '#F59E0B',
        icon: 'CheckCircle',
        order: 3,
        estimatedDuration: 2,
        isActive: true
      },
      {
        name: 'Finishing',
        displayName: 'Finishing',
        slug: 'finishing',
        description: 'Final touches and packaging',
        color: '#EF4444',
        icon: 'Package',
        order: 4,
        estimatedDuration: 2,
        isActive: true
      },
      {
        name: 'Shipping',
        displayName: 'Shipping',
        slug: 'shipping',
        description: 'Ready for shipment',
        color: '#06B6D4',
        icon: 'Truck',
        order: 5,
        estimatedDuration: 1,
        isActive: true
      }
    ]);

    console.log(`Created ${productionStages.length} production stages`);

    // Create default users if not exist
    const adminExists = await User.findOne({ email: 'admin@demo.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin User',
        email: 'admin@demo.com',
        password: 'password',
        role: 'admin',
        isActive: true
      });
      console.log('Created default admin user');
    }

    const vmdExists = await User.findOne({ email: 'vmd@demo.com' });
    if (!vmdExists) {
      await User.create({
        name: 'VMD Manager',
        email: 'vmd@demo.com',
        password: 'password',
        role: 'vmd',
        department: 'Visual Merchandising',
        isActive: true
      });
      console.log('Created default VMD user');
    }

    const productionExists = await User.findOne({ email: 'production@demo.com' });
    if (!productionExists) {
      await User.create({
        name: 'Production Manager',
        email: 'production@demo.com',
        password: 'password',
        role: 'production-manager',
        department: 'Production',
        isActive: true
      });
      console.log('Created default Production Manager user');
    }

    console.log('\n✅ Dynamic system seeded successfully!');
    console.log('\nDepartments:');
    departments.forEach(d => console.log(`  - ${d.name} (${d.slug})`));
    console.log('\nStages:');
    stages.forEach(s => console.log(`  - ${s.name} (${s.slug})`));
    console.log('\nProduction Stages:');
    productionStages.forEach(s => console.log(`  - ${s.name} (${s.slug}) - ${s.estimatedDuration} days`));
    console.log('\nFields:');
    fields.forEach(f => console.log(`  - ${f.name} [${f.department}]`));

  } catch (error) {
    console.error('Error seeding dynamic data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedDynamic();
