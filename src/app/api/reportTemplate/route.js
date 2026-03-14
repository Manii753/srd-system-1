import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ReportTemplate from '@/models/ReportTemplate';
import ReportTemplateState from '@/models/ReportTemplateState';
import {
  getAllReportTemplatesEnsuringDefault,
  getPopulatedReportTemplateById,
  sanitizeReportTemplateColumns,
} from '@/lib/reportTemplateServer';

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const template = await getPopulatedReportTemplateById(id);

      if (!template) {
        return NextResponse.json({ error: 'Report template not found' }, { status: 404 });
      }

      return NextResponse.json(template);
    }

    const templates = await getAllReportTemplatesEnsuringDefault();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('GET /api/reportTemplate error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const columns = await sanitizeReportTemplateColumns(body.columns);
    const templateCount = await ReportTemplate.countDocuments();
    const shouldActivate = !!body.isActive || templateCount === 0;

    if (shouldActivate) {
      await ReportTemplate.updateMany({}, { isActive: false });
    }

    const template = await ReportTemplate.create({
      name: String(body.name || '').trim() || 'Untitled Report Template',
      columns,
      isActive: shouldActivate,
    });

    await ReportTemplateState.findOneAndUpdate(
      { key: 'report-template-migration' },
      { key: 'report-template-migration', hasSeeded: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const populatedTemplate = await getPopulatedReportTemplateById(template._id);
    return NextResponse.json(populatedTemplate, { status: 201 });
  } catch (error) {
    console.error('POST /api/reportTemplate error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const templateId = id || body.id;

    if (!templateId) {
      return NextResponse.json({ error: 'Missing report template id' }, { status: 400 });
    }

    const updatePayload = {};

    if (body.name !== undefined) {
      updatePayload.name = String(body.name || '').trim() || 'Untitled Report Template';
    }

    if (body.columns !== undefined) {
      updatePayload.columns = await sanitizeReportTemplateColumns(body.columns);
    }

    if (body.isActive === true) {
      await ReportTemplate.updateMany({}, { isActive: false });
      updatePayload.isActive = true;
    } else if (body.isActive === false) {
      updatePayload.isActive = false;
    }

    const updatedTemplate = await ReportTemplate.findByIdAndUpdate(templateId, updatePayload, { new: true });

    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Report template not found' }, { status: 404 });
    }

    const populatedTemplate = await getPopulatedReportTemplateById(updatedTemplate._id);
    return NextResponse.json(populatedTemplate);
  } catch (error) {
    console.error('PATCH /api/reportTemplate error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing report template id' }, { status: 400 });
    }

    const template = await ReportTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: 'Report template not found' }, { status: 404 });
    }

    const wasActive = template.isActive;

    await ReportTemplate.findByIdAndDelete(id);

    if (wasActive) {
      const newestTemplate = await ReportTemplate.findOne().sort({ createdAt: -1 });

      if (newestTemplate) {
        await ReportTemplate.updateMany({}, { isActive: false });
        newestTemplate.isActive = true;
        await newestTemplate.save();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/reportTemplate error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
