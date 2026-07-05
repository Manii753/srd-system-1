import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Costing from '@/models/Costing';
import SRD from '@/models/SRD';

function extractTrimRows(srd, fieldNamePattern) {
  const field = (srd.dynamicFields || []).find(f =>
    fieldNamePattern.test(f.name || '') || fieldNamePattern.test(f.slug || '')
  );
  if (!field || field.type !== 'table') return null;
  const rows = field.value?.rows || [];
  if (!rows.length) return null;
  return rows
    .filter(row => Array.isArray(row) && row[0]?.toString().trim())
    .map(row => ({
      description: row[0]?.toString().trim() || '',
      consumption:  Number(row[4]) || 0,
      price: 0,
      amount: 0,
    }));
}

const DEFAULT_BEFORE_WASH_TRIMS = [
  { description: 'Thread',          consumption: 0, price: 0, amount: 0 },
  { description: 'Wash Care Label', consumption: 0, price: 0, amount: 0 },
  { description: 'Knee D P OFF',    consumption: 0, price: 0, amount: 0 },
  { description: 'EL FLIP',         consumption: 0, price: 0, amount: 0 },
  { description: 'Pocket Zip',      consumption: 0, price: 0, amount: 0 },
  { description: 'Cord',            consumption: 0, price: 0, amount: 0 },
  { description: 'Web Elastic Hem', consumption: 0, price: 0, amount: 0 },
];

const DEFAULT_AFTER_WASH_TRIMS = [
  { description: 'PJ Patch',      consumption: 0, price: 0, amount: 0 },
  { description: 'Grand Label',   consumption: 4.0, price: 0, amount: 0 },
  { description: 'Size Label',    consumption: 1.1, price: 0, amount: 0 },
  { description: 'Buttons/Metal', consumption: 11.5, price: 0, amount: 0 },
  { description: 'Rivets',        consumption: 8.7, price: 0, amount: 0 },
  { description: 'Fly Button',    consumption: 9.5, price: 0, amount: 0 },
  { description: 'Popper',        consumption: 3.0, price: 0, amount: 0 },
  { description: 'Buckle',        consumption: 93,  price: 0, amount: 0 },
  { description: 'Draw Cord',     consumption: 15,  price: 0, amount: 0 },
  { description: 'Swing Tag',     consumption: 4,   price: 0, amount: 0 },
  { description: 'Hans Tag',      consumption: 6,   price: 0, amount: 0 },
  { description: 'Cord',          consumption: 2,   price: 0, amount: 0 },
];

/**
 * POST /api/costing/[srdId]/resync
 * Re-pulls Before/After Wash Trim rows from SRD dynamic fields into postCost.
 * Preserves all price values already entered.
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;

    const srd = await SRD.findById(srdId).select('refNo dynamicFields BuyerDetails').lean();
    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    let costing = await Costing.findOne({ srd: srdId });
    if (!costing) {
      return NextResponse.json({ success: false, error: 'Costing not found. Open Post-Costing first.' }, { status: 404 });
    }

    // Pull new rows from SRD
    const bwtFromSrd = extractTrimRows(srd, /before.wash.trim/i) || DEFAULT_BEFORE_WASH_TRIMS;
    const awtFromSrd = extractTrimRows(srd, /after.wash.trim/i) || DEFAULT_AFTER_WASH_TRIMS;

    // Merge: preserve existing prices for matching descriptions
    const mergeRows = (newRows, existingRows) => {
      return newRows.map(nr => {
        const match = (existingRows || []).find(
          er => er.description?.toLowerCase() === nr.description?.toLowerCase()
        );
        return match
          ? { ...nr, price: match.price, amount: nr.consumption * match.price }
          : nr;
      });
    };

    costing.postCost.beforeWashTrims = mergeRows(bwtFromSrd, costing.postCost.beforeWashTrims);
    costing.postCost.afterWashTrims  = mergeRows(awtFromSrd, costing.postCost.afterWashTrims);
    costing.markModified('postCost');
    await costing.save();

    return NextResponse.json({ success: true, data: costing });
  } catch (err) {
    console.error('[costing resync]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
