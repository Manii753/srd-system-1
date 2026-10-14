import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Field from '@/models/Field';
import SRD from '@/models/SRD';
import CostingFieldMap from '@/models/CostingFieldMap';
import { findCostingDoc } from '@/lib/costingDoc';
import { resolveCosting } from '@/lib/costingGrid';
import {
  COSTING_SOURCES, SOURCE_BY_KEY, applyMapping, autoDetectMapping, cellText,
} from '@/lib/costingSources';

/**
 * GET /api/costing/[srdId]/raise-sr?type=pre|post
 *
 * Resolves the user's configured Costing ➜ SR field connection
 * (see /api/costing/field-map) against this sheet and returns the ready-to-post
 * `dynamicFields` array plus a preview for the UI.
 *
 * The SRD itself is created by the canonical `POST /api/srd` endpoint (which
 * owns refNo generation, per-department status seeding, production stages,
 * notifications and the refNo duplicate-key retry) — this route only resolves
 * the field connection.
 */

// ─── Connection lookup ───────────────────────────────────────────────────────

/** Saved mapping for this side, falling back to auto-detect before anything is saved. */
async function resolveMapping(side, fields) {
  const saved = await CostingFieldMap.findOne({ side }).lean();
  if (saved?.entries && Object.keys(saved.entries).length) {
    return { mapping: saved.entries, saved: true, updatedAt: saved.updatedAt || null };
  }
  return { mapping: autoDetectMapping(fields), saved: false, updatedAt: null };
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;
    const type = new URL(request.url).searchParams.get('type') === 'post' ? 'post' : 'pre';

    const costing = await findCostingDoc(srdId, { lean: true });
    if (!costing) {
      return NextResponse.json({ success: false, error: 'Costing sheet not found' }, { status: 404 });
    }

    const side = (type === 'post' ? costing.postCost : costing.preCost) || {};
    const { resolvedData } = resolveCosting(side);        // resolves formula cells to numbers

    const fields = await Field.find({ active: true })
      .select('name slug type department parentHeading order tableHeaders isRequired isOptional')
      .lean();

    const { mapping, saved, updatedAt } = await resolveMapping(type, fields);
    const items = applyMapping({ side, resolved: resolvedData, fields, mapping });

    // Which sources are connected but have nothing to push on this sheet.
    const usedKeys = new Set(items.map(i => i.key));
    const unmappedSources = COSTING_SOURCES
      .filter(s => !mapping[s.key])
      .map(s => s.key);

    const pocLabel = costing.pocNumber ? `POC-${costing.pocNumber}` : '';
    const title = [pocLabel, cellText(side.brand) || cellText(side.buyer), cellText(side.description)]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 140);

    // If this costing is already linked to an SRD, offer to open it instead.
    let linkedSrd = null;
    if (costing.srd) {
      linkedSrd = await SRD.findById(costing.srd).select('refNo title').lean();
    }

    return NextResponse.json({
      success: true,
      type,
      pocNumber: costing.pocNumber ?? null,
      title,
      items,
      mapping,
      mappingSaved: saved,
      mappingUpdatedAt: updatedAt,
      // Diagnostics for the dialog: what is connected vs. what isn't.
      connectedCount: Object.keys(mapping).length,
      sourceCount: COSTING_SOURCES.length,
      mappedFields: Object.values(mapping).map(String),
      emptySources: [...usedKeys],
      unmappedSources,
      linkedSrd,
    });
  } catch (err) {
    console.error('[raise-sr GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST (preview only; the SR is created by POST /api/srd) ─────────────────

/**
 * Optional: dry-run the connection against an explicit mapping without saving
 * it, so the dialog can preview a change before the user commits it.
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;
    const { type, mapping } = await request.json();

    const costing = await findCostingDoc(srdId, { lean: true });
    if (!costing) {
      return NextResponse.json({ success: false, error: 'Costing sheet not found' }, { status: 404 });
    }

    const sideKey = type === 'post' ? 'post' : 'pre';
    const side = (sideKey === 'post' ? costing.postCost : costing.preCost) || {};
    const { resolvedData } = resolveCosting(side);

    const fields = await Field.find({ active: true }).lean();
    const items = applyMapping({ side, resolved: resolvedData, fields, mapping });

    return NextResponse.json({
      success: true,
      items: items.map(i => ({
        key: i.key,
        label: SOURCE_BY_KEY[i.key]?.label || i.key,
        target: i.target,
        type: i.type,
        rows: i.rows,
        preview: i.preview,
      })),
    });
  } catch (err) {
    console.error('[raise-sr POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}