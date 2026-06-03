import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProductionStage from '@/models/ProductionStage';

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = await params;
  
  try {
    const stage = await ProductionStage.findById(id);
    if (!stage) {
      return NextResponse.json({ success: false, error: 'Stage not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: stage });
  } catch (error) {
    console.error('Error fetching production stage:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  await dbConnect();
  const { id } = await params;
  
  try {
    const body = await request.json();

    const updatedStage = await ProductionStage.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedStage) {
      return NextResponse.json({ success: false, error: 'Stage not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedStage });
  } catch (error) {
    console.error('Error updating production stage:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  await dbConnect();
  const { id } = await params;
  
  try {
    // Check if any SRDs are currently using this stage
    const SRD = (await import('@/models/SRD')).default;
    const inUseCount = await SRD.countDocuments({ currentProductionStage: id });
    
    if (inUseCount > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot delete: ${inUseCount} SRD(s) are currently at this stage. Move them first.`
      }, { status: 400 });
    }

    const deletedStage = await ProductionStage.findByIdAndDelete(id);

    if (!deletedStage) {
      return NextResponse.json({ success: false, error: 'Stage not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Stage "${deletedStage.name}" deleted` });
  } catch (error) {
    console.error('Error deleting production stage:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
