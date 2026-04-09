import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProductionStage from '@/models/ProductionStage';

export async function GET() {
  await dbConnect();
  try {
    const stages = await ProductionStage.find({}).sort({ order: 1 });
    return NextResponse.json({ success: true, data: stages });
  } catch (error) {
    console.error('Error fetching production stages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();

    if (!body.slug) {
      body.slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (!body.displayName) {
      body.displayName = body.name;
    }

    const newStage = await ProductionStage.create(body);
    
    return NextResponse.json({ success: true, data: newStage }, { status: 201 });
  } catch (error) {
    console.error('Error creating production stage:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
