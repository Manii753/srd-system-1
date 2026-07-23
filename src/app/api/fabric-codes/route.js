import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import FabricCode from '@/models/FabricCode';

// GET — return all fabric codes (or search by query param ?q=...)
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    let codes;
    if (q) {
      codes = await FabricCode.find({
        $or: [
          { code: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ],
      })
        .sort({ code: 1 })
        .limit(50)
        .lean();
    } else {
      codes = await FabricCode.find({}).sort({ code: 1 }).lean();
    }

    return NextResponse.json({ success: true, data: codes });
  } catch (err) {
    console.error('[fabric-codes GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST — save a new fabric code (or update if exists)
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { code, description } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    const normalizedCode = code.trim();

    // Upsert: update if exists, insert if not
    const existing = await FabricCode.findOne({ code: normalizedCode });
    if (existing) {
      if (description !== undefined) {
        existing.description = description;
        await existing.save();
      }
      return NextResponse.json({ success: true, data: existing });
    }

    const newCode = await FabricCode.create({
      code: normalizedCode,
      description: description || '',
    });

    return NextResponse.json({ success: true, data: newCode });
  } catch (err) {
    console.error('[fabric-codes POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE — remove a fabric code
export async function DELETE(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    await FabricCode.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[fabric-codes DELETE]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
