import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Costing from '@/models/Costing';

/**
 * GET /api/costing
 * Returns a list of all costing documents with basic SRD info.
 */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const type   = searchParams.get('type');
    const status = searchParams.get('status');
    const limit  = parseInt(searchParams.get('limit') || '200', 10);

    const docs = await Costing.find({})
      .populate('srd', 'refNo title createdAt')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    let result = docs;
    if (type && status) {
      const field = type === 'pre' ? 'preCost' : 'postCost';
      result = docs.filter(d => d[field]?.status === status);
    }

    const shaped = result.map(doc => ({
      _id:       doc._id,
      srd:       doc.srd,
      standalone: doc.standalone,
      pocNumber: doc.pocNumber,
      preCost:   doc.preCost  ? { status: doc.preCost.status,  total: doc.preCost.totalCost,  currency: doc.preCost.currency,  buyer: doc.preCost.buyer,  style: doc.preCost.style,  submittedAt: doc.preCost.submittedAt,  approvedAt: doc.preCost.approvedAt  } : null,
      postCost:  doc.postCost ? { status: doc.postCost.status, total: doc.postCost.totalCost, currency: doc.postCost.currency, buyer: doc.postCost.buyer, style: doc.postCost.style, submittedAt: doc.postCost.submittedAt, approvedAt: doc.postCost.approvedAt } : null,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
    }));

    return NextResponse.json({ success: true, data: shaped, count: shaped.length });
  } catch (err) {
    console.error('[costing list GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/costing
 * Creates a new blank standalone pre-costing sheet with an auto-incremented POC number.
 */
export async function POST(request) {
  try {
    await dbConnect();

    // Auto-increment: find highest existing pocNumber
    const last = await Costing.findOne({ pocNumber: { $ne: null } })
      .sort({ pocNumber: -1 })
      .select('pocNumber')
      .lean();
    const nextPoc = (last?.pocNumber || 0) + 1;

    const DEFAULT_PRE = {
      currency: 'USD',
      date: '', buyer: '', style: '', fit: '', fabric: '', wash: '',
      fabrics: [
        { description: 'Fabric',    consumption: 0, price: 0, amount: 0 },
        { description: 'Fabric 2',  consumption: 0, price: 0, amount: 0 },
        { description: 'Pocketing', consumption: 0, price: 0, amount: 0 },
      ],
      beforeWashTrims: [
        { description: 'Thread',          consumption: 0, price: 0, amount: 0 },
        { description: 'Wash Care Label', consumption: 0, price: 0, amount: 0 },
        { description: 'Pocket Zip',      consumption: 0, price: 0, amount: 0 },
        { description: 'Cord',            consumption: 0, price: 0, amount: 0 },
      ],
      afterWashTrims: [
        { description: 'Grand Label',   consumption: 4.0,  price: 0, amount: 0 },
        { description: 'Size Label',    consumption: 1.1,  price: 0, amount: 0 },
        { description: 'Buttons/Metal', consumption: 11.5, price: 0, amount: 0 },
        { description: 'Rivets',        consumption: 8.7,  price: 0, amount: 0 },
        { description: 'Fly Button',    consumption: 9.5,  price: 0, amount: 0 },
      ],
      packaging: [
        { description: 'Polybag', consumption: 8,  price: 0, amount: 0 },
        { description: 'Carton',  consumption: 17, price: 0, amount: 0 },
      ],
      embellishment: [],
      testingCharges: 9,
      patchesAttachment: 10, gussetAttachment: 8, badgesAttachments: 0,
      cmtCargo: 0, cmtsPocket: 175, oh: 500, washing: 175, extraCut: 15, fob: 75,
      total: 0, loMargin: 0, priceIsPkr: 0, linds: 245,
      finalFobUs: 0, pchErrorPct: 0, totalCost: 0,
      status: 'draft', notes: '',
    };

    const costing = await Costing.create({
      srd: null,
      standalone: true,
      pocNumber: nextPoc,
      preCost: DEFAULT_PRE,
      postCost: {},
    });

    return NextResponse.json({ success: true, data: { _id: costing._id, pocNumber: costing.pocNumber } }, { status: 201 });
  } catch (err) {
    console.error('[costing create POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
