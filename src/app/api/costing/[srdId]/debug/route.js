import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Costing from '@/models/Costing';

/**
 * GET /api/costing/[srdId]/debug
 * Dumps EVERY dynamic field from this SRD — name, slug, type, value summary.
 * Visit in browser to diagnose extraction failures.
 */
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { srdId } = await params;

    const srd = await SRD.findOne(
      // Accept both ObjectId and refNo
      srdId.length === 24 ? { _id: srdId } : { refNo: srdId }
    )
      .select('refNo title dynamicFields BuyerDetails createdAt')
      .populate('BuyerDetails', 'name')
      .lean();

    if (!srd) {
      return NextResponse.json({ success: false, error: `SRD not found: ${srdId}` }, { status: 404 });
    }

    const costing = await Costing.findOne({ srd: srd._id }).lean();

    // Full dump of every dynamic field
    const allFields = (srd.dynamicFields || []).map((f, i) => ({
      i,
      name: f.name,
      slug: f.slug,
      type: f.type,
      department: f.department,
      parentHeading: f.parentHeading,
      // For table fields show full structure
      ...(f.type === 'table' ? {
        tableHeaders_from_field: f.tableHeaders,
        value_headers: f.value?.headers,
        value_rowCount: f.value?.rows?.length ?? 0,
        value_rows: f.value?.rows ?? [],
        value_predefinedData: f.value?.predefinedData ?? [],
        value_isObject: typeof f.value === 'object' && !Array.isArray(f.value),
        raw_value_keys: f.value ? Object.keys(f.value) : [],
      } : {
        value: String(f.value ?? '').slice(0, 120),
      }),
    }));

    // Highlight table fields
    const tableFields = allFields.filter(f => f.type === 'table');

    // Show what patterns match
    const patterns = {
      '/^fabrics?$/i': allFields.filter(f => /^fabrics?$/i.test(f.name || '') || /^fabrics?$/i.test(f.slug || '')),
      '/before.wash.trim/i': allFields.filter(f => /before.wash.trim/i.test(f.name || '') || /before.wash.trim/i.test(f.slug || '')),
      '/after.wash.trim/i':  allFields.filter(f => /after.wash.trim/i.test(f.name || '') || /after.wash.trim/i.test(f.slug || '')),
      '/embellish/i':        allFields.filter(f => /embellish/i.test(f.name || '') || /embellish/i.test(f.slug || '')),
      '/^style$/i':          allFields.filter(f => /^style$/i.test(f.name || '') || f.slug === 'style'),
      '/^fabric/i':          allFields.filter(f => /^fabric/i.test(f.name || '') || /^fabric/i.test(f.slug || '')),
    };

    return NextResponse.json({
      success: true,
      srd: { _id: srd._id, refNo: srd.refNo, title: srd.title, buyer: srd.BuyerDetails?.name },
      totalDynamicFields: allFields.length,
      tableFields,
      patternMatches: patterns,
      costingExists: !!costing,
      costingSections: costing ? {
        fabricRows: costing.postCost?.fabrics?.length,
        bwtRows: costing.postCost?.beforeWashTrims?.length,
        awtRows: costing.postCost?.afterWashTrims?.length,
        embRows: costing.postCost?.embellishment?.length,
      } : null,
      allFields,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack }, { status: 500 });
  }
}
