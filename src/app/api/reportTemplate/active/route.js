import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { ensureActiveReportTemplate } from '@/lib/reportTemplateServer';

export async function GET() {
  try {
    await dbConnect();

    const activeTemplate = await ensureActiveReportTemplate();

    if (!activeTemplate) {
      return NextResponse.json({ error: 'No active report template found' }, { status: 404 });
    }

    return NextResponse.json(activeTemplate);
  } catch (error) {
    console.error('GET /api/reportTemplate/active error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
