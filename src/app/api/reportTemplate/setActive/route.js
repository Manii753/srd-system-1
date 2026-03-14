import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ReportTemplate from '@/models/ReportTemplate';
import { getPopulatedReportTemplateById } from '@/lib/reportTemplateServer';

export async function POST(request) {
  try {
    await dbConnect();

    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json({ error: 'Missing report template id' }, { status: 400 });
    }

    const existingTemplate = await ReportTemplate.findById(templateId);
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Report template not found' }, { status: 404 });
    }

    await ReportTemplate.updateMany({}, { isActive: false });

    const updatedTemplate = await ReportTemplate.findByIdAndUpdate(
      templateId,
      { isActive: true },
      { new: true }
    );

    const populatedTemplate = await getPopulatedReportTemplateById(updatedTemplate._id);
    return NextResponse.json(populatedTemplate);
  } catch (error) {
    console.error('POST /api/reportTemplate/setActive error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
