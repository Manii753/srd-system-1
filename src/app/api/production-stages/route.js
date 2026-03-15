import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProductionStage from '@/models/ProductionStage';
import { normalizeProductionStagePayload } from '@/lib/productionStageUtils';

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
    const body = normalizeProductionStagePayload(await request.json());

    if (!body.displayName) {
      return NextResponse.json(
        { success: false, error: 'Production stage name is required' },
        { status: 400 }
      );
    }

    const newStage = await ProductionStage.create(body);
    
    return NextResponse.json({ success: true, data: newStage }, { status: 201 });
  } catch (error) {
    console.error('Error creating production stage:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
