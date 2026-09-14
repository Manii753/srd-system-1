import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CostSheetTemplate from '@/models/CostSheetTemplate';

const normalizeSkeleton = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .filter(r => r)
    .map(r => (r.type === 'section'
      ? { type: 'section', title: String(r.title || '') }
      : { type: 'data' }));

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const docs = await CostSheetTemplate.find({})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: docs, count: docs.length });
  } catch (err) {
    console.error('[cost-sheet-templates list GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ success: false, error: 'Template name is required.' }, { status: 400 });
    }

    const doc = await CostSheetTemplate.create({
      name: String(body.name).trim(),
      description: body.description || '',
      columns: Array.isArray(body.columns) ? body.columns : [],
      defaultRows: Math.max(1, parseInt(body.defaultRows, 10) || 5),
      skeleton: normalizeSkeleton(body.skeleton),
      createdBy: body.author || '',
      updatedBy: body.author || '',
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    console.error('[cost-sheet-templates POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}