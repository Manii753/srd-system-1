import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Costing from '@/models/Costing';
import SRD from '@/models/SRD';

// ─── Default row sets ─────────────────────────────────────────────────────────

const DEFAULT_FABRICS = [
  { description: 'Fabric',    consumption: 0, price: 0, amount: 0 },
  { description: 'Fabric 2',  consumption: 0, price: 0, amount: 0 },
  { description: 'Pocketing', consumption: 0, price: 0, amount: 0 },
];

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

const DEFAULT_PACKAGING = [
  { description: 'Barcode Sticker', consumption: 2.5, price: 0, amount: 0 },
  { description: 'Polybag',         consumption: 8,   price: 0, amount: 0 },
  { description: 'Carton',          consumption: 17,  price: 0, amount: 0 },
  { description: 'Carton Sticker',  consumption: 10,  price: 0, amount: 0 },
  { description: 'Carton Tape',     consumption: 2.0, price: 0, amount: 0 },
];

const DEFAULT_EMBELLISHMENT = [
  { description: 'Hotfix',                 consumption: 0, price: 0, amount: 0 },
  { description: 'Screen Print',           consumption: 0, price: 0, amount: 0 },
  { description: 'Rhinestone',             consumption: 0, price: 0, amount: 0 },
  { description: 'Applique Fabric',        consumption: 0, price: 0, amount: 0 },
  { description: 'Applique Cutting',       consumption: 0, price: 0, amount: 0 },
  { description: 'Text Applique Fabric',   consumption: 0, price: 0, amount: 0 },
  { description: 'Text Applique Cutting',  consumption: 0, price: 0, amount: 0 },
  { description: 'Text Print',             consumption: 0, price: 0, amount: 0 },
  { description: 'RIP & Repair Fabric',    consumption: 0, price: 0, amount: 0 },
];

// ─── Build default costing data ───────────────────────────────────────────────

function buildDefault() {
  return {
    currency: 'USD',
    date: '', buyer: '', style: '', fit: '', fabric: '', wash: '',
    fabrics:          JSON.parse(JSON.stringify(DEFAULT_FABRICS)),
    beforeWashTrims:  JSON.parse(JSON.stringify(DEFAULT_BEFORE_WASH_TRIMS)),
    afterWashTrims:   JSON.parse(JSON.stringify(DEFAULT_AFTER_WASH_TRIMS)),
    packaging:        JSON.parse(JSON.stringify(DEFAULT_PACKAGING)),
    embellishment:    JSON.parse(JSON.stringify(DEFAULT_EMBELLISHMENT)),
    testingCharges:   9,
    patchesAttachment: 10,
    gussetAttachment:  8,
    badgesAttachments: 0,
    cmtCargo:    0,
    cmtsPocket:  175,
    oh:          500,
    washing:     175,
    extraCut:    15,
    fob:         75,
    total: 0, loMargin: 0, priceIsPkr: 0, linds: 245,
    finalFobUs: 0, pchErrorPct: 0, totalCost: 0,
    status: 'draft', notes: '',
  };
}

// ─── Pull trim rows from SRD dynamic fields ───────────────────────────────────

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
      consumption:  Number(row[4]) || 0,   // col index 4 = Qty in most trim tables
      price: 0,
      amount: 0,
    }));
}

// ─── Recalculate totals ────────────────────────────────────────────────────────

function recalc(side) {
  const sumRows = (rows) =>
    (rows || []).reduce((s, r) => {
      r.amount = (Number(r.consumption) || 0) * (Number(r.price) || 0);
      return s + r.amount;
    }, 0);

  const fabricTotal      = sumRows(side.fabrics);
  const bwtTotal         = sumRows(side.beforeWashTrims);
  const awtTotal         = sumRows(side.afterWashTrims);
  const packagingTotal   = sumRows(side.packaging);
  const embellishTotal   = sumRows(side.embellishment);
  const testCharges      = Number(side.testingCharges) || 0;
  const patches          = Number(side.patchesAttachment) || 0;
  const gusset           = Number(side.gussetAttachment) || 0;
  const badges           = Number(side.badgesAttachments) || 0;
  const cmtCargo         = Number(side.cmtCargo) || 0;
  const cmtsPocket       = Number(side.cmtsPocket) || 0;
  const oh               = Number(side.oh) || 0;
  const washing          = Number(side.washing) || 0;
  const extraCut         = Number(side.extraCut) || 0;
  const fob              = Number(side.fob) || 0;

  side.total = fabricTotal + bwtTotal + awtTotal + packagingTotal + embellishTotal
    + testCharges + patches + gusset + badges + cmtCargo + cmtsPocket
    + oh + washing + extraCut + fob;

  const loMargin    = Number(side.loMargin) || 0;
  const linds       = Number(side.linds) || 0;
  const priceIsPkr  = Number(side.priceIsPkr) || 0;
  const pchErrorPct = Number(side.pchErrorPct) || 0;

  const base = side.total + loMargin;
  side.finalFobUs  = linds > 0 ? base / linds : 0;
  side.totalCost   = side.finalFobUs * (1 + pchErrorPct / 100);

  return side;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;

    const srd = await SRD.findById(srdId)
      .select('refNo title dynamicFields BuyerDetails')
      .populate('BuyerDetails', 'name')
      .lean();

    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    let costing = await Costing.findOne({ srd: srdId }).lean();

    if (!costing) {
      // Build post-cost with trim data from SRD dynamic fields
      const postDefault = buildDefault();

      const bwtFromSrd = extractTrimRows(srd, /before.wash.trim/i);
      if (bwtFromSrd) postDefault.beforeWashTrims = bwtFromSrd;

      const awtFromSrd = extractTrimRows(srd, /after.wash.trim/i);
      if (awtFromSrd) postDefault.afterWashTrims = awtFromSrd;

      // Pre-fill header from SRD
      postDefault.buyer = srd.BuyerDetails?.name || '';

      const preDefault = buildDefault();
      preDefault.buyer = srd.BuyerDetails?.name || '';

      costing = await Costing.create({
        srd: srdId,
        preCost:  preDefault,
        postCost: postDefault,
      });
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

    let costing = await Costing.findOne({ srd: srdId });
    if (!costing) {
      costing = new Costing({ srd: srdId, preCost: buildDefault(), postCost: buildDefault() });
    }

    const side = type === 'pre' ? costing.preCost : costing.postCost;

    if (action === 'save') {
      // Merge all incoming fields
      const fields = [
        'currency','date','buyer','style','fit','fabric','wash',
        'fabrics','beforeWashTrims','afterWashTrims','packaging','embellishment',
        'testingCharges','patchesAttachment','gussetAttachment','badgesAttachments',
        'cmtCargo','cmtsPocket','oh','washing','extraCut','fob',
        'loMargin','priceIsPkr','linds','pchErrorPct','notes',
      ];
      fields.forEach(k => { if (data[k] !== undefined) side[k] = data[k]; });
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
