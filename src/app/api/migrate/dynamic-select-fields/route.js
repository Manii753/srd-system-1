import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Field from '@/models/Field';

// One-time migration: switch Brand / Buyer / Sample Type fields to
// 'select-dynamic' so they render as autocomplete dropdowns populated from
// saved SRD values. Safe to call multiple times (idempotent) — already
// select-dynamic fields are simply left unchanged, and fields no longer in the
// SRD schema (e.g. deleted fields) are skipped for compatibility.
export async function POST() {
  await dbConnect();
  try {
    const result = await Field.updateMany(
      {
        $or: [
          { slug: 'brand' },
          { name: { $regex: '^brand$', $options: 'i' } },
          { name: { $regex: '^buyer$', $options: 'i' } },
          { slug: 'sample-type' },
          { name: { $regex: '^sample\\s*type$', $options: 'i' } },
        ],
        // Only update fields that are still plain text inputs.
        type: 'text',
      },
      {
        $set: {
          type: 'select-dynamic',
          placeholder: 'Select or type…',
        },
      }
    );
    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} field(s) to select-dynamic`,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}