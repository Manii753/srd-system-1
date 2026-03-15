import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProductionStage from '@/models/ProductionStage';

const defaultStages = [
  {
    name: 'cutting',
    displayName: 'Cutting',
    slug: 'cutting',
    order: 1,
    description: 'Fabric cutting stage',
    color: '#ef4444',
    icon: '✂️',
    isActive: true
  },
  {
    name: 'sewing',
    displayName: 'Sewing',
    slug: 'sewing',
    order: 2,
    description: 'Garment sewing and assembly',
    color: '#f59e0b',
    icon: '🧵',
    isActive: true
  },
  {
    name: 'washing',
    displayName: 'Washing',
    slug: 'washing',
    order: 3,
    description: 'Garment washing and treatment',
    color: '#3b82f6',
    icon: '💧',
    isActive: true
  },
  {
    name: 'finishing',
    displayName: 'Finishing',
    slug: 'finishing',
    order: 4,
    description: 'Final finishing and quality check',
    color: '#8b5cf6',
    icon: '✨',
    isActive: true
  },
  {
    name: 'dispatch',
    displayName: 'Dispatch',
    slug: 'dispatch',
    order: 5,
    description: 'Packaging and dispatch',
    color: '#10b981',
    icon: '📦',
    isActive: true
  }
];

export async function POST() {
  await dbConnect();
  try {
    const created = [];
    const existing = [];

    for (const stage of defaultStages) {
      const found = await ProductionStage.findOne({ 
        $or: [
          { slug: stage.slug },
          { name: { $regex: `^${stage.name}$`, $options: 'i' } },
          { displayName: { $regex: `^${stage.displayName}$`, $options: 'i' } }
        ]
      });
      
      if (found) {
        existing.push(found);
        const needsUpdate =
          found.name !== stage.name ||
          found.displayName !== stage.displayName ||
          found.slug !== stage.slug ||
          found.order !== stage.order ||
          found.description !== stage.description ||
          found.color !== stage.color ||
          found.icon !== stage.icon ||
          found.isActive !== stage.isActive;

        if (needsUpdate) {
          found.name = stage.name;
          found.displayName = stage.displayName;
          found.slug = stage.slug;
          found.order = stage.order;
          found.description = stage.description;
          found.color = stage.color;
          found.icon = stage.icon;
          found.isActive = stage.isActive;
          await found.save();
        }
      } else {
        const newStage = await ProductionStage.create(stage);
        created.push(newStage);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${created.length} new stages, ${existing.length} already existed`,
      data: { created, existing }
    });
  } catch (error) {
    console.error('Error seeding production stages:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

