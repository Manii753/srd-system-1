import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CostSheet from '@/models/CostSheet';
import CostSheetTemplate from '@/models/CostSheetTemplate';
import '@/models/SRD';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const docs = await CostSheet.find({})
      .populate('srd', 'refNo title')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: docs, count: docs.length });
  } catch (err) {
    console.error('[cost-sheets list GET]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { templateId, title, author } = body;

    let columns = [];
    let templateName = '';
    let defaultRows = 5;
    let skeleton = null;

    if (templateId) {
      const tpl = await CostSheetTemplate.findById(templateId).lean();
      if (tpl) {
        columns = tpl.columns || [];
        templateName = tpl.name || '';
        defaultRows = Math.max(1, parseInt(tpl.defaultRows, 10) || 5);
        if (Array.isArray(tpl.skeleton) && tpl.skeleton.length) skeleton = tpl.skeleton;
      }
    }

    const rows = skeleton
      ? JSON.parse(JSON.stringify(skeleton))
      : Array.from({ length: defaultRows }, () => ({ type: 'data' }));

    const doc = await CostSheet.create({
      title: title || templateName || 'Untitled Cost Sheet',
      template: templateId || null,
      templateName,
      srd: body.srd || null,
      srdRefNo: body.srdRefNo || '',
      standalone: body.standalone !== undefined ? !!body.standalone : !body.srd,
      columns,
      rows,
      createdBy: author || '',
      updatedBy: author || '',
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err) {
    console.error('[cost-sheets POST]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}