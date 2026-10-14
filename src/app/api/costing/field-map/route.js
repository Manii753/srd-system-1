import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Field from '@/models/Field';
import CostingFieldMap from '@/models/CostingFieldMap';
import {
  COSTING_SOURCES, MAPPABLE_FIELD_TYPES, autoDetectMapping,
} from '@/lib/costingSources';

/**
 * GET /api/costing/field-map?side=pre|post
 * Returns both sides of the connection so the editor can be rendered:
 *   - sources : every value a costing sheet can push into an SR
 *   - fields  : the active SRD field definitions (what the SR form renders)
 *   - mapping : the saved connection, seeded with auto-detect on first visit
 *
 * PUT /api/costing/field-map
 * Body: { side: 'pre' | 'post', mapping: { [sourceKey]: fieldId }, author }
 */
export async function GET(request) {
  try {
    await dbConnect();
    const side = new URL(request.url).searchParams.get('side') === 'post' ? 'post' : 'pre';

    const fields = await Field.find({ active: true })
      .select('name slug type department parentHeading order tableHeaders isRequired isOptional')
      .sort({ department: 1, order: 1, name: 1 })
      .lean();

    const saved = await CostingFieldMap.findOne({ side }).lean();
    const mapping = saved?.entries && Object.keys(saved.entries).length
      ? saved.entries
      : autoDetectMapping(fields);

    return NextResponse.json({
      success: true,
      side,
      sources: COSTING_SOURCES,
      fields,
      mapping,
      mappableTypes: [...MAPPABLE_FIELD_TYPES],
      saved: !!saved,
      updatedAt: saved?.updatedAt || null,
    });
  } catch (err) {
    console.error('[field-map GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const { side, mapping, author } = await request.json();
    if (!['pre', 'post'].includes(side)) {
      return NextResponse.json({ success: false, error: 'side must be "pre" or "post"' }, { status: 400 });
    }
    if (mapping && (typeof mapping !== 'object' || Array.isArray(mapping))) {
      return NextResponse.json({ success: false, error: 'mapping must be an object' }, { status: 400 });
    }

    // Drop anything that no longer points at a real, mappable SRD field so the
    // stored map can never resurrect a deleted field.
    const validKeys = new Set(COSTING_SOURCES.map(s => s.key));
    const fields = await Field.find({ active: true }).select('_id type').lean();
    const byId = new Map(fields.map(f => [String(f._id), f]));

    const clean = {};
    Object.entries(mapping || {}).forEach(([sourceKey, fieldId]) => {
      if (!validKeys.has(sourceKey) || !fieldId) return;
      const field = byId.get(String(fieldId));
      if (!field || !MAPPABLE_FIELD_TYPES.has(field.type)) return;
      const source = COSTING_SOURCES.find(s => s.key === sourceKey);
      if (source.kind === 'table' && field.type !== 'table') return;
      if (source.kind === 'scalar' && field.type === 'table') return;
      clean[sourceKey] = String(fieldId);
    });

    const doc = await CostingFieldMap.findOneAndUpdate(
      { side },
      { $set: { entries: clean, updatedBy: author || '' } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      success: true,
      side,
      mapping: doc.entries,
      updatedAt: doc.updatedAt,
      message: `${Object.keys(clean).length} field connection(s) saved`,
    });
  } catch (err) {
    console.error('[field-map PUT]', err);
    const isBadId = err.name === 'ValidationError' || err.name === 'CastError';
    return NextResponse.json(
      { success: false, error: isBadId ? 'Invalid field id in mapping' : err.message },
      { status: isBadId ? 400 : 500 },
    );
  }
}