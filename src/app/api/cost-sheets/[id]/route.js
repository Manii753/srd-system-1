import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CostSheet from '@/models/CostSheet';
import '@/models/SRD';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const doc = await CostSheet.findById(id).populate('srd', 'refNo title').lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Cost sheet not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: doc });
  } catch (err) {
    console.error('[cost-sheet GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const existing = await CostSheet.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cost sheet not found.' }, { status: 404 });
    }

    if (body.title !== undefined) existing.title = String(body.title);
    if (Array.isArray(body.columns)) existing.columns = body.columns;
    if (Array.isArray(body.rows)) existing.rows = body.rows;
    if (body.srd !== undefined) existing.srd = body.srd || null;
    if (body.srdRefNo !== undefined) existing.srdRefNo = body.srdRefNo || '';
    if (body.standalone !== undefined) existing.standalone = !!body.standalone;
    if (body.author !== undefined) existing.updatedBy = body.author;

    await existing.save();
    return NextResponse.json({ success: true, data: existing });
  } catch (err) {
    console.error('[cost-sheet PATCH]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    await CostSheet.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[cost-sheet DELETE]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}