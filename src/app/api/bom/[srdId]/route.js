import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BOM from '@/models/BOM';
import SRD from '@/models/SRD';
import Company from '@/models/Company';

// ─── Default row sets ─────────────────────────────────────────────────────────

const DEFAULT_FABRIC_ROWS = [
  { description: 'Fabric',    composition: '', placement: 'Body',    sourceOrigin: '', consNo: 0, portngPcs: 0, cons: 0 },
  { description: 'Fabric 2',  composition: '', placement: '',        sourceOrigin: '', consNo: 0, portngPcs: 0, cons: 0 },
  { description: 'Pocketing', composition: '', placement: 'Pocket',  sourceOrigin: '', consNo: 0, portngPcs: 0, cons: 0 },
];

const DEFAULT_BEFORE_WASH_TRIMS = [
  { description: 'LR Waist',       placement: 'Waist', uom: 'MTR', cons: 0, portngPcs: 0, totalCons: 0 },
  { description: 'Waist Cord Label', placement: 'Waist', uom: 'PCS', cons: 0, portngPcs: 0, totalCons: 0 },
  { description: 'Elastic None',   placement: 'Waist', uom: 'MTR', cons: 0, portngPcs: 0, totalCons: 0 },
  { description: 'Fly Elett',      placement: '',      uom: 'PCS', cons: 0, portngPcs: 0, totalCons: 0 },
  { description: 'Pocket Braid',   placement: 'Pocket', uom: 'MTR', cons: 0, portngPcs: 0, totalCons: 0 },
  { description: 'Thread',         placement: 'All Over', uom: 'MTR', cons: 0, portngPcs: 0, totalCons: 0 },
];

const DEFAULT_AFTER_WASH_TRIMS = [
  { description: 'Main Label',     placement: 'CB Neck',   uom: 'PCS', cons: 1,   portngPcs: 0, totalCons: 0 },
  { description: 'Size Label',     placement: 'CB Neck',   uom: 'PCS', cons: 1.1, portngPcs: 0, totalCons: 0 },
  { description: 'Flasher',        placement: '',          uom: 'PCS', cons: 0,   portngPcs: 0, totalCons: 0 },
  { description: 'Main Button',    placement: 'Fly',       uom: 'PCS', cons: 1,   portngPcs: 0, totalCons: 0 },
  { description: 'Button',         placement: '',          uom: 'PCS', cons: 0,   portngPcs: 0, totalCons: 0 },
  { description: 'Rivets',         placement: '',          uom: 'PCS', cons: 8.7, portngPcs: 0, totalCons: 0 },
  { description: 'Button Tag',     placement: '',          uom: 'PCS', cons: 0,   portngPcs: 0, totalCons: 0 },
  { description: 'Triangle Tag',   placement: '',          uom: 'PCS', cons: 0,   portngPcs: 0, totalCons: 0 },
  { description: 'Additional Zigzag Stitch Ticket', placement: '', uom: 'PCS', cons: 0, portngPcs: 0, totalCons: 0 },
  { description: 'Cross Chain Thread (Swansea)',    placement: '', uom: 'MTR', cons: 0, portngPcs: 0, totalCons: 0 },
  { description: 'Extra Final Terms',    placement: '',    uom: 'PCS', cons: 0,   portngPcs: 0, totalCons: 0 },
  { description: 'Embossed Stitch',      placement: '',    uom: 'PCS', cons: 0,   portngPcs: 0, totalCons: 0 },
  { description: 'Patch Tag',            placement: '',    uom: 'PCS', cons: 0,   portngPcs: 0, totalCons: 0 },
  { description: 'Zipper',              placement: 'Fly',  uom: 'PCS', cons: 1,   portngPcs: 0, totalCons: 0 },
  { description: 'Zipper Tape',         placement: '',     uom: 'MTR', cons: 0,   portngPcs: 0, totalCons: 0 },
];

const DEFAULT_SIZE_GRID = [
  { label: 'PO QTY',              xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, total: 0 },
  { label: 'CUT QTY @ LDM',       xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, total: 0 },
  { label: 'DIFF BETWEEN',        xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, total: 0 },
  { label: 'CUT LESS CUT @ QTY',  xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, total: 0 },
  { label: 'DIE LESS LESS CUT @ QTY @ LDM', xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, total: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDynValue(srd, pattern) {
  const f = (srd.dynamicFields || []).find(f =>
    pattern instanceof RegExp
      ? (pattern.test(f.name || '') || pattern.test(f.slug || ''))
      : (f.slug === pattern || (f.name || '').toLowerCase() === pattern.toLowerCase())
  );
  if (!f) return '';
  const v = f.value;
  if (v instanceof Date) return v.toLocaleDateString();
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function extractTableRows(srd, ...patterns) {
  for (const pattern of patterns) {
    const field = (srd.dynamicFields || []).find(f =>
      f.type === 'table' && (pattern.test(f.name || '') || pattern.test(f.slug || ''))
    );
    if (!field) continue;
    const raw = field.value;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const rows = Array.isArray(raw.rows) ? raw.rows : [];
    const headers = Array.isArray(raw.headers) ? raw.headers : Array.isArray(field.tableHeaders) ? field.tableHeaders : [];
    if (!rows.length) continue;
    const hNames = headers.map(h => (typeof h === 'string' ? h : (h?.name ?? '')).toLowerCase());
    let qtyIdx = hNames.findIndex(h => h === 'qty' || h.includes('quantity') || h.includes('consump'));
    if (qtyIdx === -1) qtyIdx = Math.min(4, Math.max(0, hNames.length - 1));
    const result = rows
      .filter(row => Array.isArray(row) && String(row[0] ?? '').trim())
      .map(row => ({ description: String(row[0] ?? '').trim(), consumption: Number(row[qtyIdx]) || 0 }));
    if (result.length) return result;
  }
  return null;
}

// ─── Build from SRD ───────────────────────────────────────────────────────────

function buildFromSrd(srd) {
  const bom = {
    season:      '',
    date:        srd.createdAt ? new Date(srd.createdAt).toLocaleDateString() : '',
    buyer:       getDynValue(srd, /^brand$/i),
    style:       getDynValue(srd, /^buyer\s*style\s*ref/i),
    fabric:      '',
    yarn:        getDynValue(srd, /^yarn/i),
    styleName:   getDynValue(srd, /^style\s*name/i),
    composition: getDynValue(srd, /^composition/i),
    construction: getDynValue(srd, /^construction/i),
    washColor:   getDynValue(srd, /^wash\s*[/\\-]?\s*color|^color\s*[/\\-]?\s*wash/i),
    fit:         getDynValue(srd, /^fit$/i),
    referenceNo: srd.refNo || '',
    sizeGrid:    JSON.parse(JSON.stringify(DEFAULT_SIZE_GRID)),
    fabricDetails:   JSON.parse(JSON.stringify(DEFAULT_FABRIC_ROWS)),
    beforeWashTrims: JSON.parse(JSON.stringify(DEFAULT_BEFORE_WASH_TRIMS)),
    afterWashTrims:  JSON.parse(JSON.stringify(DEFAULT_AFTER_WASH_TRIMS)),
    specialComments: '',
    preparedBy: '',
    verifiedBy: '',
    approvedBy: '',
    status: 'draft',
  };

  // Fabric header
  const fabricTableField = (srd.dynamicFields || []).find(f => f.type === 'table' && /^fabric$/i.test(f.name || ''));
  if (fabricTableField?.value?.rows?.[0]) {
    const r = fabricTableField.value.rows[0];
    bom.fabric = [r[0], r[1], r[2]].filter(v => v && String(v).trim()).join(' / ');
    // Build fabric rows from table
    const fRows = fabricTableField.value.rows;
    const fHeaders = fabricTableField.value.headers || fabricTableField.tableHeaders || [];
    const hNames = fHeaders.map(h => (typeof h === 'string' ? h : h?.name ?? '').toLowerCase());
    let consumIdx = hNames.findIndex(h => h.includes('consump'));
    if (consumIdx === -1) consumIdx = 4;
    bom.fabricDetails = fRows
      .filter(row => Array.isArray(row) && String(row[0] ?? '').trim())
      .map(row => ({
        description:  [row[0], row[1]].filter(v => v && String(v).trim()).join(' / '),
        composition:  String(row[2] ?? '').trim(),
        placement:    String(row[3] ?? '').trim(),
        sourceOrigin: '',
        consNo:       0,
        portngPcs:    0,
        cons:         Number(row[consumIdx]) || 0,
      }));
    if (!bom.fabricDetails.length) bom.fabricDetails = JSON.parse(JSON.stringify(DEFAULT_FABRIC_ROWS));
  } else {
    bom.fabric = [
      getDynValue(srd, /^fabric\s*code$/i),
      getDynValue(srd, /^fabric\s*type$/i),
      getDynValue(srd, /^color$/i),
    ].filter(Boolean).join(' / ');
  }

  // Before wash trims from SRD table
  const bwtRows = extractTableRows(srd, /^before\s+wash\s+trim/i, /before.wash.trim/i);
  if (bwtRows) {
    bom.beforeWashTrims = bwtRows.map(r => ({
      description: r.description, placement: '', uom: 'PCS', cons: r.consumption, portngPcs: 0, totalCons: 0,
    }));
  }

  // After wash trims from SRD table
  const awtRows = extractTableRows(srd, /^after\s+wash\s+trim/i, /after.wash.trim/i);
  if (awtRows) {
    bom.afterWashTrims = awtRows.map(r => ({
      description: r.description, placement: '', uom: 'PCS', cons: r.consumption, portngPcs: 0, totalCons: 0,
    }));
  }

  return bom;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request, { params }) {
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

    const company = await Company.findOne().select('name').lean();

    let bom = await BOM.findOne({ srd: srdId }).lean();
    if (!bom) {
      bom = await BOM.create({ srd: srdId, ...buildFromSrd(srd) });
      bom = await BOM.findOne({ srd: srdId }).lean();
    }

    return NextResponse.json({
      success: true,
      data: bom,
      srd: { _id: srd._id, refNo: srd.refNo, title: srd.title },
      company: { name: company?.name || 'LAZIENDA DENIM PVT LTD' },
    });
  } catch (err) {
    console.error('[BOM GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

const SAVEABLE_FIELDS = [
  'season','date','buyer','style','fabric','yarn','styleName','composition',
  'construction','washColor','fit','referenceNo',
  'sizeGrid','fabricDetails','beforeWashTrims','afterWashTrims',
  'specialComments','preparedBy','verifiedBy','approvedBy',
];

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;
    const { action, data, author } = await request.json();

    let bom = await BOM.findOne({ srd: srdId });
    if (!bom) {
      const srd = await SRD.findById(srdId).select('refNo title createdAt dynamicFields').lean();
      bom = new BOM({ srd: srdId, ...(srd ? buildFromSrd(srd) : {}) });
    }

    if (action === 'save') {
      SAVEABLE_FIELDS.forEach(k => { if (data[k] !== undefined) bom[k] = data[k]; });
      bom.updatedBy = author || '';
      // Mark arrays as modified for Mongoose
      ['sizeGrid','fabricDetails','beforeWashTrims','afterWashTrims'].forEach(k => bom.markModified(k));

    } else if (action === 'submit') {
      bom.status      = 'submitted';
      bom.submittedBy = author || '';
      bom.submittedAt = new Date();

    } else if (action === 'approve') {
      bom.status        = 'approved';
      bom.approvedByName = author || '';
      bom.approvedAt    = new Date();

    } else if (action === 'reject') {
      bom.status = 'rejected';

    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    await bom.save();
    const updated = await BOM.findOne({ srd: srdId }).lean();

    return NextResponse.json({ success: true, data: updated, message: `BOM ${action}d` });
  } catch (err) {
    console.error('[BOM PATCH]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;
    await BOM.deleteOne({ srd: srdId });
    return NextResponse.json({ success: true, message: 'BOM reset. Reload to rebuild from SRD.' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
