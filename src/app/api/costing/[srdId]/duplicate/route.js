import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Costing from '@/models/Costing';
import { findCostingDoc, nextPocNumber } from '@/lib/costingDoc';
import { recalcCosting } from '@/lib/costingRecalc';

/**
 * POST /api/costing/[srdId]/duplicate
 * Clones an existing costing draft into a brand-new standalone draft with a
 * fresh POC number and every value pre-filled (header fields, all four item
 * sections incl. codes/dropdown columns, production cost levels, margin,
 * quote tracking, images and notes).
 *
 * Workflow state is reset back to "draft" so the copy can be edited/submitted.
 * Body (optional): { type: 'pre' | 'post', author: string }
 */

// Everything worth carrying over to the copy.
const COPY_FIELDS = [
  // Header
  'currency', 'date', 'brand', 'fitSpecsCode', 'fit', 'description',
  'fabricType', 'embellishmentYesNo', 'costingBase', 'sampleSize',
  // Legacy
  'buyer', 'style', 'fabric', 'wash',
  // Dropdown column config
  'extraCols', 'levelOptions',
  // Item sections (deep-copied below)
  'fabrics', 'beforeWashTrims', 'afterWashTrims', 'embellishment',
  // Production cost
  'cmtLevel', 'washingLevel', 'cmtLevelCode', 'washingLevelCode', 'fob',
  // Margin & commission
  'extraCut', 'ldMargin', 'testingCharges', 'commission',
  // Summary
  'currencyRate',
  // Quote tracking
  'firstQuoted', 'targetPrice', 'secondQuote', 'confirmedPrice',
  // Media & notes
  'images', 'notes',
];

const clone = (v) => (v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)));

/** Strip workflow/derived fields and copy the payload onto a fresh side object. */
function buildCopy(side) {
  const copy = {};
  COPY_FIELDS.forEach((k) => {
    if (side?.[k] !== undefined) copy[k] = clone(side[k]);
  });
  if (!copy.levelOptions?.length) copy.levelOptions = ['1', '2', '3'];
  copy.extraCols = copy.extraCols || [];

  // Workflow reset — the duplicate is always an editable draft.
  copy.status = 'draft';
  copy.submittedBy = '';
  copy.submittedAt = undefined;
  copy.approvedBy = '';
  copy.approvedAt = undefined;

  // Derived fields are recomputed from the copied values.
  copy.totalPricePkr = 0;
  copy.finalFobUs = 0;
  copy.difference = 0;

  return recalcCosting(copy);
}

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;

    const body = await request.json().catch(() => ({}));
    const type = body.type === 'post' ? 'post' : 'pre';
    const author = body.author || '';

    const original = await findCostingDoc(srdId, { lean: true });
    if (!original) {
      return NextResponse.json({ success: false, error: 'Costing sheet not found' }, { status: 404 });
    }

    const sourceSide = type === 'post' ? original.postCost : original.preCost;
    const preCost  = buildCopy(original.preCost);
    const postCost = buildCopy(original.postCost);

    const pocNumber = await nextPocNumber();

    // Always standalone: the unique sparse index on `srd` only allows one
    // costing per SRD, so a copy must not keep the SRD link.
    const copy = new Costing({
      standalone: true,
      pocNumber,
      preCost,
      postCost,
      createdBy: author || original.createdBy || '',
      updatedBy: author || '',
    });
    // Deliberately omit `srd` so the sparse unique index ignores this document.
    await copy.save();

    return NextResponse.json({
      success: true,
      data: { _id: copy._id, pocNumber: copy.pocNumber },
      message: `Duplicated as POC-${copy.pocNumber}`,
    }, { status: 201 });
  } catch (err) {
    console.error('[costing duplicate POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}