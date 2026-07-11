import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Costing from '@/models/Costing';

/**
 * GET /api/costing
 * Returns a list of all costing documents with basic SRD info.
 * Supports ?type=pre|post to filter by section status.
 */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const type   = searchParams.get('type');   // 'pre' | 'post' | null (both)
    const status = searchParams.get('status'); // filter by status within a type
    const limit  = parseInt(searchParams.get('limit') || '200', 10);

    const docs = await Costing.find({})
      .populate('srd', 'refNo title createdAt')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    // Optionally filter by status of a specific type
    let result = docs;
    if (type && status) {
      const field = type === 'pre' ? 'preCost' : 'postCost';
      result = docs.filter(d => d[field]?.status === status);
    }

    // Shape the response to include only the relevant section
    const shaped = result.map(doc => ({
      _id:       doc._id,
      srd:       doc.srd,
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
