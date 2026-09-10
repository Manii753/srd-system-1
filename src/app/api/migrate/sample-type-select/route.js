import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Field from '@/models/Field';

// One-time migration: change Sample Type field type from 'text' to 'select-dynamic'
// so it renders as a combobox that auto-populates from existing values.
// Safe to call multiple times (idempotent).
export async function POST() {
  await dbConnect();
  try {
    const result = await Field.updateMany(
      {
        $or: [
          { slug: 'sample-type' },
          { name: { $regex: '^sample\\s*type$', $options: 'i' } },
        ],
        type: 'text', // only update if still 'text'
      },
      { $set: { type: 'select-dynamic', placeholder: 'Select or type a sample type…' } }
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
