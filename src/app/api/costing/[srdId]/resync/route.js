import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Costing from '@/models/Costing';
import SRD from '@/models/SRD';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDynValue(srd, pattern) {
  const f = (srd.dynamicFields || []).find(f =>
    pattern.test(f.name || '') || pattern.test(f.slug || '')
  );
  if (!f || f.value == null) return '';
  if (f.value instanceof Date) return new Date(f.value).toLocaleDateString();
  return String(f.value);
}

/**
 * Extract rows from a table-type SRD dynamic field.
 * Returns null if the field doesn't exist or has no rows.
 * col 0 = description, Qty col detected by header name or defaults to col 4.
 */
function extractTableRows(srd, ...patterns) {
  for (const pattern of patterns) {
    // Must be type=table — skip heading fields with the same name
    const field = (srd.dynamicFields || []).find(f =>
      f.type === 'table' &&
      (pattern.test(f.name || '') || pattern.test(f.slug || ''))
    );

    if (!field) continue;

    const raw = field.value;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;

    const rows    = Array.isArray(raw.rows)    ? raw.rows    : [];
    const headers = Array.isArray(raw.headers) ? raw.headers
                  : Array.isArray(field.tableHeaders) ? field.tableHeaders : [];

    if (!rows.length) continue;

    // Normalise header names to strings
    const hNames = headers.map(h =>
      (typeof h === 'string' ? h : (h?.name ?? '')).toLowerCase()
    );

    // Find Qty column — look for qty/quantity/consump, default col 4
    let qtyIdx = hNames.findIndex(h => h === 'qty' || h.includes('quantity') || h.includes('consump'));
    if (qtyIdx === -1) qtyIdx = Math.min(4, Math.max(0, hNames.length - 1));

    const result = rows
      .filter(row => Array.isArray(row) && String(row[0] ?? '').trim())
      .map(row => ({
        description: String(row[0] ?? '').trim(),
        consumption: Number(row[qtyIdx]) || 0,
        price: 0,
        amount: 0,
      }));

    if (result.length) return result;
  }
  return null;
}

// Fabric rows from the Fabric table field or individual VMD text fields
function buildFabricRows(srd) {
  const fabricTableField = (srd.dynamicFields || []).find(
    f => f.type === 'table' && /^fabric$/i.test(f.name || '')
  );

  if (fabricTableField?.value?.rows?.length) {
    const fRows    = fabricTableField.value.rows;
    const fHeaders = fabricTableField.value.headers || fabricTableField.tableHeaders || [];
    const hNames   = fHeaders.map(h => (typeof h === 'string' ? h : h?.name ?? '').toLowerCase());
    let consumIdx  = hNames.findIndex(h => h.includes('consump'));
    if (consumIdx === -1) consumIdx = 4;

    const fabricRows = fRows
      .filter(row => Array.isArray(row) && String(row[0] ?? '').trim())
      .map(row => ({
        description: [row[0], row[1], row[2]].filter(v => v && String(v).trim()).join(' / '),
        consumption: Number(row[consumIdx]) || 0,
        price: 0, amount: 0,
      }));

    if (fabricRows.length) {
      return [
        ...fabricRows,
        { description: 'Pocketing', consumption: 0, price: 0, amount: 0 },
      ];
    }
  }

  // Fallback to individual text fields
  const fCode     = getDynValue(srd, /^fabric\s*code$/i);
  const fType     = getDynValue(srd, /^fabric\s*type$/i);
  const fColor    = getDynValue(srd, /^color$/i);
  const fSupplier = getDynValue(srd, /^fabric\s*supplier$/i);
  const mainDesc  = [fCode, fType, fColor].filter(Boolean).join(' / ');

  const rows = [];
  if (mainDesc) rows.push({ description: mainDesc, consumption: 0, price: 0, amount: 0 });
  if (fSupplier) rows.push({ description: `Supplier: ${fSupplier}`, consumption: 0, price: 0, amount: 0 });
  rows.push({ description: 'Pocketing', consumption: 0, price: 0, amount: 0 });
  return rows;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
  fabrics: [
    { description: 'Fabric',    consumption: 0, price: 0, amount: 0 },
    { description: 'Fabric 2',  consumption: 0, price: 0, amount: 0 },
    { description: 'Pocketing', consumption: 0, price: 0, amount: 0 },
  ],
  beforeWashTrims: [
    { description: 'Thread',          consumption: 0, price: 0, amount: 0 },
    { description: 'Wash Care Label', consumption: 0, price: 0, amount: 0 },
    { description: 'Knee D P OFF',    consumption: 0, price: 0, amount: 0 },
    { description: 'EL FLIP',         consumption: 0, price: 0, amount: 0 },
    { description: 'Pocket Zip',      consumption: 0, price: 0, amount: 0 },
    { description: 'Cord',            consumption: 0, price: 0, amount: 0 },
    { description: 'Web Elastic Hem', consumption: 0, price: 0, amount: 0 },
  ],
  afterWashTrims: [
    { description: 'PU Patch',      consumption: 0,    price: 0, amount: 0 },
    { description: 'Grand Label',   consumption: 4.0,  price: 0, amount: 0 },
    { description: 'Size Label',    consumption: 1.1,  price: 0, amount: 0 },
    { description: 'Buttons/Metal', consumption: 11.5, price: 0, amount: 0 },
    { description: 'Rivets',        consumption: 8.7,  price: 0, amount: 0 },
    { description: 'Fly Button',    consumption: 9.5,  price: 0, amount: 0 },
    { description: 'Popper',        consumption: 3.0,  price: 0, amount: 0 },
    { description: 'Buckle',        consumption: 93,   price: 0, amount: 0 },
    { description: 'Draw Cord',     consumption: 15,   price: 0, amount: 0 },
    { description: 'Swing Tag',     consumption: 4,    price: 0, amount: 0 },
    { description: 'Hans Tag',      consumption: 6,    price: 0, amount: 0 },
    { description: 'Cord',          consumption: 2,    price: 0, amount: 0 },
  ],
  embellishment: [
    { description: 'Hotfix',                consumption: 0, price: 0, amount: 0 },
    { description: 'Screen Print',          consumption: 0, price: 0, amount: 0 },
    { description: 'Rhinestone',            consumption: 0, price: 0, amount: 0 },
    { description: 'Applique Fabric',       consumption: 0, price: 0, amount: 0 },
    { description: 'Applique Cutting',      consumption: 0, price: 0, amount: 0 },
    { description: 'Text Applique Fabric',  consumption: 0, price: 0, amount: 0 },
    { description: 'Text Applique Cutting', consumption: 0, price: 0, amount: 0 },
    { description: 'Text Print',            consumption: 0, price: 0, amount: 0 },
    { description: 'RIP & Repair Fabric',   consumption: 0, price: 0, amount: 0 },
  ],
};

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function mergePreservingPrices(newRows, existingRows) {
  return newRows.map(nr => {
    const match = (existingRows || []).find(
      er => er.description?.toLowerCase().trim() === nr.description?.toLowerCase().trim()
    );
    return match ? { ...nr, price: match.price, amount: nr.consumption * match.price } : nr;
  });
}

/**
 * POST /api/costing/[srdId]/resync
 *
 * HARD RESET: deletes the existing postCost sections and rebuilds them
 * entirely from SRD dynamic fields. Preserves prices for matching items.
 * Also refreshes header fields (buyer, style, fabric, wash, fit, date).
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;

    const srd = await SRD.findById(srdId)
      .select('refNo title createdAt dynamicFields BuyerDetails')
      .populate('BuyerDetails', 'name')
      .lean();

    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    let costing = await Costing.findOne({ srd: srdId });
    if (!costing) {
      // Create a fresh one — the resync will populate it
      costing = await Costing.create({ srd: srdId });
    }

    // ── Detect old schema (has sections[] instead of fabrics[]) and wipe ────
    const hasOldSchema = costing.postCost?.sections != null || costing.preCost?.sections != null;
    if (hasOldSchema) {
      await Costing.deleteOne({ srd: srdId });
      costing = await Costing.create({ srd: srdId });
    }

    const existing = costing.postCost || {};

    // ── Pull each section from SRD ──────────────────────────────────────────

    // FABRICS — try table field first, then individual text fields
    const fabricsFromTable = extractTableRows(srd,
      /^fabrics?$/i,
      /^fabric.?table/i
    );
    const freshFabrics = fabricsFromTable
      || (buildFabricRows(srd).length > 1 ? buildFabricRows(srd) : null)
      || deepClone(DEFAULTS.fabrics);

    // BEFORE WASH TRIM — exact name "Before Wash Trim" (singular), also try plural
    const freshBwt = extractTableRows(srd,
      /^before\s+wash\s+trim$/i,       // exact singular
      /^before\s+wash\s+trims$/i,      // plural
      /before.wash.trim/i              // broad fallback
    ) || deepClone(DEFAULTS.beforeWashTrims);

    // AFTER WASH TRIM — exact name "After Wash Trim" (singular), also try plural
    const freshAwt = extractTableRows(srd,
      /^after\s+wash\s+trim$/i,        // exact singular
      /^after\s+wash\s+trims$/i,       // plural
      /after.wash.trim/i               // broad fallback
    ) || deepClone(DEFAULTS.afterWashTrims);

    // EMBELLISHMENT
    const freshEmb = extractTableRows(srd,
      /^embellishment$/i,
      /^embellishments$/i,
      /embellish/i
    ) || deepClone(DEFAULTS.embellishment);

    // ── Merge preserving existing prices ────────────────────────────────────
    costing.postCost.fabrics         = mergePreservingPrices(freshFabrics, existing.fabrics);
    costing.postCost.beforeWashTrims = mergePreservingPrices(freshBwt, existing.beforeWashTrims);
    costing.postCost.afterWashTrims  = mergePreservingPrices(freshAwt, existing.afterWashTrims);
    costing.postCost.embellishment   = mergePreservingPrices(freshEmb, existing.embellishment);

    // ── Refresh header fields ────────────────────────────────────────────────
    costing.postCost.buyer = getDynValue(srd, /^brand$/i) || existing.buyer || '';
    costing.postCost.style = getDynValue(srd, /^buyer\s*style\s*ref/i) || existing.style || '';
    const _fField = (srd.dynamicFields || []).find(f => f.type === 'table' && /^fabric$/i.test(f.name || ''));
    if (_fField?.value?.rows?.[0]) {
      const _r = _fField.value.rows[0];
      costing.postCost.fabric = [_r[0], _r[1], _r[2]].filter(v => v && String(v).trim()).join(' / ');
    } else {
      const _rCode  = getDynValue(srd, /^fabric\s*code$/i);
      const _rType  = getDynValue(srd, /^fabric\s*type$/i);
      const _rColor = getDynValue(srd, /^color$/i);
      costing.postCost.fabric = [_rCode, _rType, _rColor].filter(Boolean).join(' / ') || existing.fabric || '';
    }
    costing.postCost.wash = getDynValue(srd, /^wash\s*[/\\]\s*color$|^color\s*[/\\]\s*wash$|^wash\s*color$|^color\s*wash$/i) || existing.wash || '';
    costing.postCost.fit  = getDynValue(srd, /^fit$/i) || existing.fit || '';
    const _raisedDate = getDynValue(srd, /sample\s*(r(aise|equest)|raised|request)\s*date/i);
    costing.postCost.date = _raisedDate || existing.date
      || (srd.createdAt ? new Date(srd.createdAt).toLocaleDateString() : '');

    costing.markModified('postCost');
    await costing.save();

    // Return a summary of what was pulled for transparency
    return NextResponse.json({
      success: true,
      data: costing,
      message: 'Post-costing re-synced from SRD form',
      pulled: {
        fabrics:         costing.postCost.fabrics.map(r => r.description),
        beforeWashTrims: costing.postCost.beforeWashTrims.map(r => r.description),
        afterWashTrims:  costing.postCost.afterWashTrims.map(r => r.description),
        embellishment:   costing.postCost.embellishment.map(r => r.description),
      },
    });
  } catch (err) {
    console.error('[costing resync]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
