import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CostSheetTemplate from '@/models/CostSheetTemplate';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const doc = await CostSheetTemplate.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[cost-sheet-template GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const existing = await CostSheetTemplate.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 });
    }

    if (body.name !== undefined) existing.name = String(body.name).trim();
    if (body.description !== undefined) existing.description = body.description || '';
    if (Array.isArray(body.columns)) existing.columns = body.columns;
    if (body.defaultRows !== undefined) {
      existing.defaultRows = Math.max(1, parseInt(body.defaultRows, 10) || 5);
    }
    if (body.author !== undefined) existing.updatedBy = body.author;

    await existing.save();
    return NextResponse.json({ success: true, data: existing });
  } catch (err) {
    console.error('[cost-sheet-template PATCH]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    await CostSheetTemplate.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[cost-sheet-template DELETE]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}