import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Costing from '@/models/Costing';
import SRD from '@/models/SRD';

// ─── Default row sets (fallback when no SRD table field exists) ───────────────

const DEFAULT_FABRICS = [
  { description: 'Fabric 1 Name (Boddy)', code: '', consumption: 0, price: 0, amount: 0 },
  { description: 'Fabric 2 (Pocketing)',  code: '', consumption: 0, price: 0, amount: 0 },
  { description: 'Fabric 3 Name (Patch/Applique)', code: '', consumption: 0, price: 0, amount: 0 },
];
const DEFAULT_BEFORE_WASH_TRIMS = [
  { description: 'Thread',          consumption: 0, price: 0, amount: 0 },
  { description: 'Wash Care Label', consumption: 0, price: 0, amount: 0 },
  { description: 'Ld Label',        consumption: 0, price: 0, amount: 0 },
  { description: 'Front Zip',       consumption: 0, price: 0, amount: 0 },
  { description: 'Fly Zip',         consumption: 0, price: 0, amount: 0 },
  { description: 'Hook & Bar',      consumption: 0, price: 0, amount: 0 },
  { description: 'Fusing',          consumption: 0, price: 0, amount: 0 },
  { description: 'Wb Elastic/Hem',  consumption: 0, price: 0, amount: 0 },
];
const DEFAULT_AFTER_WASH_TRIMS = [
  { description: 'P.U Patch',                      consumption: 0, price: 0, amount: 0 },
  { description: 'Brand Main Label',               consumption: 0, price: 0, amount: 0 },
  { description: 'Size Label',                     consumption: 0, price: 0, amount: 0 },
  { description: 'Buttons/Metal',                  consumption: 0, price: 0, amount: 0 },
  { description: 'Button Attachment',              consumption: 0, price: 0, amount: 0 },
  { description: 'Fly Button',                     consumption: 0, price: 0, amount: 0 },
  { description: 'Rivets',                         consumption: 0, price: 0, amount: 0 },
  { description: 'Button',                         consumption: 0, price: 0, amount: 0 },
  { description: 'Snap Button Attachment',         consumption: 0, price: 0, amount: 0 },
  { description: 'Eyelets',                        consumption: 0, price: 0, amount: 0 },
  { description: 'Eyelets Attachment',             consumption: 0, price: 0, amount: 0 },
  { description: 'Buckle',                         consumption: 0, price: 0, amount: 0 },
  { description: 'Rivets Attachment',              consumption: 0, price: 0, amount: 0 },
  { description: 'Triangle Tag',                   consumption: 0, price: 0, amount: 0 },
  { description: 'Additional External Return Ticket', consumption: 0, price: 0, amount: 0 },
  { description: 'Disclaimer Tag Over Dye',        consumption: 0, price: 0, amount: 0 },
  { description: 'Hang Tag',                       consumption: 0, price: 0, amount: 0 },
  { description: 'Hang Tag Cord',                  consumption: 0, price: 0, amount: 0 },
  { description: 'Barcode Sticker',                consumption: 0, price: 0, amount: 0 },
  { description: 'Polybag',                        consumption: 0, price: 0, amount: 0 },
  { description: 'Carton',                         consumption: 0, price: 0, amount: 0 },
  { description: 'Carton Sticker',                 consumption: 0, price: 0, amount: 0 },
  { description: 'Carton Tape',                    consumption: 0, price: 0, amount: 0 },
];
const DEFAULT_EMBELLISHMENT = [
  { description: 'Rhinestone',   consumption: 0, price: 0, amount: 0 },
  { description: 'Studs',        consumption: 0, price: 0, amount: 0 },
  { description: 'Screen Print', consumption: 0, price: 0, amount: 0 },
  { description: 'Round Dori',   consumption: 0, price: 0, amount: 0 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get a single dynamic field value by slug or name pattern */
function getDynValue(srd, slugOrPattern) {
  const fields = srd.dynamicFields || [];
  const f = fields.find(f => {
    if (slugOrPattern instanceof RegExp) {
      return slugOrPattern.test(f.name || '') || slugOrPattern.test(f.slug || '');
    }
    return f.slug === slugOrPattern || f.name?.toLowerCase() === slugOrPattern.toLowerCase();
  });
  if (!f) return '';
  const v = f.value;
  if (v instanceof Date) return v.toLocaleDateString();
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

/**
 * Extract costing rows from a table-type SRD dynamic field.
 * Accepts multiple patterns — tries each in order, returns first match.
 * Column 0 = description. Qty col = first header named qty/quantity/consump, else col 4.
 * Skips non-table fields (e.g. heading fields with the same name).
 */
function extractTableRows(srd, ...patterns) {
  for (const pattern of patterns) {
    // Find the first field that matches the pattern AND is type=table
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

    const hNames = headers.map(h =>
      (typeof h === 'string' ? h : (h?.name ?? '')).toLowerCase()
    );

    let qtyIdx = hNames.findIndex(h => h === 'qty' || h.includes('quantity') || h.includes('consump'));
    if (qtyIdx === -1) qtyIdx = Math.min(4, Math.max(0, hNames.length - 1));

    const result = rows
      .filter(row => Array.isArray(row) && String(row[0] ?? '').trim())
      .map(row => ({
        description: String(row[0] ?? '').trim(),
        consumption: Number(row[qtyIdx]) || 0,
        price: 0, amount: 0,
      }));

    if (result.length) return result;
  }
  return null;
}

/**
 * For sections where SRD uses individual text fields (not a table field),
 * build rows from any text/number fields whose names match the given patterns.
 * Returns null if nothing found.
 */
function extractTextRows(srd, namePatternsWithConsumption) {
  const fields = srd.dynamicFields || [];
  const rows = [];
  for (const { pattern, consumption } of namePatternsWithConsumption) {
    const f = fields.find(f => pattern.test(f.name || '') || pattern.test(f.slug || ''));
    if (f && f.value !== null && f.value !== undefined && String(f.value).trim()) {
      rows.push({
        description: f.name,
        consumption: consumption ?? Number(f.value) ?? 0,
        price:  0,
        amount: 0,
      });
    }
  }
  return rows.length ? rows : null;
}

// ─── Build default costing data ───────────────────────────────────────────────

function buildDefault() {
  return {
    currency: 'USD',
    // Header fields
    date: '', brand: '', fitSpecsCode: '', fit: '', description: '',
    fabricType: '', embellishmentYesNo: 'No', costingBase: 'Image', sampleSize: '',
    // Legacy fields
    buyer: '', style: '', fabric: '', wash: '',
    // Sections
    fabrics:          JSON.parse(JSON.stringify(DEFAULT_FABRICS)),
    beforeWashTrims:  JSON.parse(JSON.stringify(DEFAULT_BEFORE_WASH_TRIMS)),
    afterWashTrims:   JSON.parse(JSON.stringify(DEFAULT_AFTER_WASH_TRIMS)),
    embellishment:    JSON.parse(JSON.stringify(DEFAULT_EMBELLISHMENT)),
    // Production cost
    cmtLevel: 0, washingLevel: 0, fob: 0,
    // Freight
    freight: 0,
    // Margin & Commission
    marginPct: 0, extraCut: 0, ldMargin: 0, testingCharges: 0, commission: 0,
    // Summary
    totalPricePkr: 0, finalFobUs: 0, currencyRate: 265,
    // Quote tracking
    firstQuoted: 0, targetPrice: 0, difference: 0, secondQuote: 0, confirmedPrice: 0,
    // Images
    images: [],
    // Workflow
    status: 'draft', notes: '',
  };
}

/**
 * Build post-cost data from SRD dynamic fields.
 * Priority for each section: table field → individual text fields → hardcoded defaults.
 */
function buildPostFromSrd(srd) {
  const post = buildDefault();

  // ── Header fields ──────────────────────────────────────────────────────────
  // New fields
  post.brand = getDynValue(srd, /^brand$/i);
  post.fitSpecsCode = getDynValue(srd, /^fit\s*spec\s*code$/i) || getDynValue(srd, /^buyer\s*style\s*ref/i);
  post.fit = getDynValue(srd, /^fit$/i);
  post.description = getDynValue(srd, /^description$/i) || getDynValue(srd, /^garment\s*description$/i);
  post.fabricType = getDynValue(srd, /^fabric\s*type$/i);
  post.embellishmentYesNo = getDynValue(srd, /^embellish/i) === 'Yes' ? 'Yes' : 'No';
  post.costingBase = getDynValue(srd, /^costing\s*base$/i) || 'Image';
  post.sampleSize = getDynValue(srd, /^sample\s*size$/i) || getDynValue(srd, /^size$/i);

  // Legacy fields (for backward compatibility)
  post.buyer = post.brand;
  post.style = post.fitSpecsCode;
  
  // Fabric header: pull first row cols 0-2 from the Fabric table, else text fields
  const _fTableField = (srd.dynamicFields || []).find(f => f.type === 'table' && /^fabric$/i.test(f.name || ''));
  if (_fTableField?.value?.rows?.[0]) {
    const _r = _fTableField.value.rows[0];
    post.fabric = [_r[0], _r[1], _r[2]].filter(v => v && String(v).trim()).join(' / ');
  } else {
    post.fabric = [
      getDynValue(srd, /^fabric\s*code$/i),
      getDynValue(srd, /^fabric\s*type$/i),
      getDynValue(srd, /^color$/i),
    ].filter(Boolean).join(' / ');
  }
  post.wash = getDynValue(srd, /^wash\s*[/\\]\s*color$|^color\s*[/\\]\s*wash$|^wash\s*color$|^color\s*wash$/i);
  const raiseDate = getDynValue(srd, /sample\s*(r(aise|equest)|raised|request)\s*date/i);
  post.date = raiseDate || (srd.createdAt ? new Date(srd.createdAt).toLocaleDateString() : '');

  // ── FABRICS ────────────────────────────────────────────────────────────────
  // The Fabric table has columns: Fabric Code | Fabric Type | Color | Fabric Supplier | Consumption | ...
  // Build one row per fabric entry with description = "Code / Type / Color"
  const fabricTableField = (srd.dynamicFields || []).find(
    f => f.type === 'table' && /^fabric$/i.test(f.name || '')
  );

  if (fabricTableField?.value?.rows?.length) {
    const fRows    = fabricTableField.value.rows;
    const fHeaders = fabricTableField.value.headers || fabricTableField.tableHeaders || [];
    const hNames   = fHeaders.map(h => (typeof h === 'string' ? h : h?.name ?? '').toLowerCase());

    // Find Consumption column index
    let consumIdx = hNames.findIndex(h => h.includes('consump'));
    if (consumIdx === -1) consumIdx = 4; // default col 4

    const fabricRows = fRows
      .filter(row => Array.isArray(row) && String(row[0] ?? '').trim())
      .map(row => ({
        // Description = first 3 non-empty columns joined
        description: [row[0], row[1], row[2]].filter(v => v && String(v).trim()).join(' / '),
        code: String(row[0] ?? '').trim(),
        consumption: Number(row[consumIdx]) || 0,
        price: 0, amount: 0,
      }));

    if (fabricRows.length) {
      post.fabrics = [
        ...fabricRows,
        { description: 'Pocketing', code: '', consumption: 0, price: 0, amount: 0 },
      ];
    }
  } else {
    // Fallback: text fields
    const fCode     = getDynValue(srd, /^fabric\s*code$/i);
    const fType     = getDynValue(srd, /^fabric\s*type$/i);
    const fColor    = getDynValue(srd, /^color$/i);
    const fSupplier = getDynValue(srd, /^fabric\s*supplier$/i);
    const mainDesc  = [fCode, fType, fColor].filter(Boolean).join(' / ');
    if (mainDesc) {
      post.fabrics = [
        { description: mainDesc, code: fCode || '', consumption: 0, price: 0, amount: 0 },
        ...(fSupplier ? [{ description: `Supplier: ${fSupplier}`, code: '', consumption: 0, price: 0, amount: 0 }] : []),
        { description: 'Pocketing', code: '', consumption: 0, price: 0, amount: 0 },
      ];
    }
    // else keep DEFAULT_FABRICS
  }

  // ── BEFORE WASH TRIM ──────────────────────────────────────────────────────
  const bwtTable = extractTableRows(srd,
    /^before\s+wash\s+trim$/i,     // exact singular (matches screenshot heading)
    /^before\s+wash\s+trims$/i,    // plural variant
    /before.wash.trim/i            // broad fallback
  );
  if (bwtTable) {
    post.beforeWashTrims = bwtTable;
  } else {
    const rows = extractTextRows(srd, [
      { pattern: /^thread$/i },
      { pattern: /wash.care.label/i },
      { pattern: /ld.label/i },
      { pattern: /front.zip/i },
      { pattern: /fly.zip/i },
      { pattern: /hook.*bar/i },
      { pattern: /fusing/i },
      { pattern: /wb.elastic|hem/i },
    ]);
    if (rows) post.beforeWashTrims = rows;
  }

  // ── AFTER WASH TRIM ───────────────────────────────────────────────────────
  const awtTable = extractTableRows(srd,
    /^after\s+wash\s+trim$/i,      // exact singular
    /^after\s+wash\s+trims$/i,     // plural variant
    /after.wash.trim/i             // broad fallback
  );
  if (awtTable) {
    post.afterWashTrims = awtTable;
  } else {
    const rows = extractTextRows(srd, [
      { pattern: /pu.patch/i },
      { pattern: /brand.main.label|brand.label/i },
      { pattern: /size.label/i },
      { pattern: /buttons.*metal/i },
      { pattern: /button.attachment/i },
      { pattern: /fly.button/i },
      { pattern: /^rivets?$/i },
      { pattern: /^button$/i },
      { pattern: /snap.button.attachment/i },
      { pattern: /^eyelets?$/i },
      { pattern: /eyelets.attachment/i },
      { pattern: /buckle/i },
      { pattern: /rivets.attachment/i },
      { pattern: /triangle.tag/i },
      { pattern: /return.ticket/i },
      { pattern: /disclaimer.tag/i },
      { pattern: /hang.tag$/i },
      { pattern: /hang.tag.cord/i },
      { pattern: /barcode.sticker/i },
      { pattern: /polybag/i },
      { pattern: /carton$/i },
      { pattern: /carton.sticker/i },
      { pattern: /carton.tape/i },
    ]);
    if (rows) post.afterWashTrims = rows;
  }

  // ── EMBELLISHMENT ─────────────────────────────────────────────────────────
  const embTable = extractTableRows(srd,
    /^embellishment$/i,
    /^embellishments$/i,
    /embellish/i
  );
  if (embTable) {
    post.embellishment = embTable;
  } else {
    const rows = extractTextRows(srd, [
      { pattern: /rhinestone/i },
      { pattern: /^studs?$/i },
      { pattern: /screen.print/i },
      { pattern: /round.dori/i },
    ]);
    if (rows) post.embellishment = rows;
  }

  return post;
}

// ─── Recalculate totals ────────────────────────────────────────────────────────

function recalc(side) {
  const sumRows = (rows) =>
    (rows || []).reduce((s, r) => {
      r.amount = (Number(r.consumption) || 0) * (Number(r.price) || 0);
      return s + r.amount;
    }, 0);

  const totalFabrics = sumRows(side.fabrics);
  const totalBeforeWash = sumRows(side.beforeWashTrims);
  const totalAfterWash = sumRows(side.afterWashTrims);
  const totalEmbellishment = sumRows(side.embellishment);

  const subtotal = totalFabrics + totalBeforeWash + totalAfterWash + totalEmbellishment;
  const totalWithProduction = subtotal + Number(side.cmtLevel || 0) + Number(side.washingLevel || 0) + Number(side.fob || 0);
  const totalWithFreight = totalWithProduction + Number(side.freight || 0);
  const marginAmount = totalWithFreight * (Number(side.marginPct || 0) / 100);
  const totalWithMargin = totalWithFreight + marginAmount;
  const totalWithExtra = totalWithMargin + Number(side.extraCut || 0) + Number(side.ldMargin || 0) + Number(side.testingCharges || 0) + Number(side.commission || 0);

  side.totalPricePkr = totalWithExtra;
  const currencyRate = Number(side.currencyRate) || 265;
  side.finalFobUs = totalWithExtra / currencyRate;
  side.difference = Number(side.firstQuoted || 0) - Number(side.targetPrice || 0);

  return side;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;

    // First: check if this is a standalone costing doc (id is a Costing _id)
    let standaloneCosting = await Costing.findById(srdId).lean();
    if (standaloneCosting?.standalone) {
      return NextResponse.json({
        success: true,
        data: standaloneCosting,
        srd: null,
        pocNumber: standaloneCosting.pocNumber,
      });
    }

    const srd = await SRD.findById(srdId)
      .select('refNo title createdAt dynamicFields BuyerDetails')
      .populate('BuyerDetails', 'name')
      .lean();

    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    let costing = await Costing.findOne({ srd: srdId }).lean();

    if (!costing) {
      const postDefault = buildPostFromSrd(srd);

      const preDefault  = buildDefault();
      // Populate new header fields
      preDefault.brand = getDynValue(srd, /^brand$/i);
      preDefault.fitSpecsCode = getDynValue(srd, /^fit\s*spec\s*code$/i) || getDynValue(srd, /^buyer\s*style\s*ref/i);
      preDefault.fit = getDynValue(srd, /^fit$/i);
      preDefault.description = getDynValue(srd, /^description$/i) || getDynValue(srd, /^garment\s*description$/i);
      preDefault.fabricType = getDynValue(srd, /^fabric\s*type$/i);
      preDefault.embellishmentYesNo = getDynValue(srd, /^embellish/i) === 'Yes' ? 'Yes' : 'No';
      preDefault.costingBase = getDynValue(srd, /^costing\s*base$/i) || 'Image';
      preDefault.sampleSize = getDynValue(srd, /^sample\s*size$/i) || getDynValue(srd, /^size$/i);
      // Legacy fields
      preDefault.buyer = preDefault.brand;
      preDefault.style = preDefault.fitSpecsCode;
      
      const _pfField = (srd.dynamicFields || []).find(f => f.type === 'table' && /^fabric$/i.test(f.name || ''));
      if (_pfField?.value?.rows?.[0]) {
        const _pr = _pfField.value.rows[0];
        preDefault.fabric = [_pr[0], _pr[1], _pr[2]].filter(v => v && String(v).trim()).join(' / ');
      } else {
        preDefault.fabric = [getDynValue(srd, /^fabric\s*code$/i), getDynValue(srd, /^fabric\s*type$/i), getDynValue(srd, /^color$/i)].filter(Boolean).join(' / ');
      }
      preDefault.wash   = getDynValue(srd, /^wash\s*[/\\]\s*color$|^color\s*[/\\]\s*wash$|^wash\s*color$|^color\s*wash$/i);
      preDefault.date   = getDynValue(srd, /sample\s*(r(aise|equest)|raised|request)\s*date/i)
        || (srd.createdAt ? new Date(srd.createdAt).toLocaleDateString() : '');

      costing = await Costing.create({ srd: srdId, preCost: preDefault, postCost: postDefault });
      costing = await Costing.findOne({ srd: srdId }).lean();
    }

    return NextResponse.json({
      success: true,
      data: costing,
      srd: { _id: srd._id, refNo: srd.refNo, title: srd.title },
    });
  } catch (err) {
    console.error('[costing GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;
    const body = await request.json();
    const { type, action, data, author } = body;

    if (!['pre', 'post'].includes(type)) {
      return NextResponse.json({ success: false, error: 'type must be "pre" or "post"' }, { status: 400 });
    }

    // Try standalone costing by _id first
    let costing = await Costing.findById(srdId);
    if (!costing || !costing.standalone) {
      // Fall back to SRD-linked costing
      costing = await Costing.findOne({ srd: srdId });
    }

    if (!costing) {
      const srd = await SRD.findById(srdId)
        .select('refNo createdAt dynamicFields BuyerDetails')
        .populate('BuyerDetails', 'name')
        .lean();
      costing = new Costing({
        srd: srdId,
        preCost:  buildDefault(),
        postCost: srd ? buildPostFromSrd(srd) : buildDefault(),
      });
    }

    const side = type === 'pre' ? costing.preCost : costing.postCost;

    if (action === 'save') {
      const FIELDS = [
        // Header fields
        'currency', 'date', 'brand', 'fitSpecsCode', 'fit', 'description',
        'fabricType', 'embellishmentYesNo', 'costingBase', 'sampleSize',
        // Legacy fields
        'buyer', 'style', 'fabric', 'wash',
        // Sections
        'fabrics', 'beforeWashTrims', 'afterWashTrims', 'embellishment',
        // Production cost
        'cmtLevel', 'washingLevel', 'fob',
        // Freight
        'freight',
        // Margin & Commission
        'marginPct', 'extraCut', 'ldMargin', 'testingCharges', 'commission',
        // Summary
        'totalPricePkr', 'finalFobUs', 'currencyRate',
        // Quote tracking
        'firstQuoted', 'targetPrice', 'difference', 'secondQuote', 'confirmedPrice',
        // Images
        'images',
        // Workflow
        'notes',
      ];
      FIELDS.forEach(k => { if (data[k] !== undefined) side[k] = data[k]; });
      recalc(side);
      costing.updatedBy = author || '';

    } else if (action === 'submit') {
      side.status      = 'submitted';
      side.submittedBy = author || '';
      side.submittedAt = new Date();

    } else if (action === 'approve') {
      side.status     = 'approved';
      side.approvedBy = author || '';
      side.approvedAt = new Date();

    } else if (action === 'reject') {
      side.status = 'rejected';

    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    costing.markModified(type === 'pre' ? 'preCost' : 'postCost');
    await costing.save();

    return NextResponse.json({
      success: true,
      data: costing,
      message: `${type === 'pre' ? 'Pre' : 'Post'}-Costing ${action}d successfully`,
    });
  } catch (err) {
    console.error('[costing PATCH]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
// ─── DELETE — wipe costing doc so GET recreates it fresh from SRD ────────────

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;
    await Costing.deleteOne({ srd: srdId });
    return NextResponse.json({ success: true, message: 'Costing reset. Reload the page to rebuild from SRD.' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
